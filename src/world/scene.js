import * as THREE from "three";
import { clamp } from "../core/runtime.js";
import { elements, rarities } from "../data/catalog.js";
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
/** Owns all GPU resources; simulation entities only expose serializable values. */
export class WorldView {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#7aafb7");
    this.scene.fog = new THREE.FogExp2("#80aeb5", 0.019);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
    this.scene.add(new THREE.HemisphereLight("#c1efff", "#36454a", 2));
    this.sun = new THREE.DirectionalLight("#fff1cc", 3.3);
    this.sun.position.set(-10, 22, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -26,
      right: 26,
      top: 20,
      bottom: -20,
      near: 1,
      far: 65,
    });
    this.sun.shadow.bias = -0.001;
    this.scene.add(this.sun);
    this.env = new THREE.Group();
    this.scene.add(this.env);
    this.actors = new Map();
    this.props = new Map();
    this.loot = new Map();
    this.temp = [];
    this.clock = 0;
    this.geo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.IcosahedronGeometry(1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
      cone: new THREE.ConeGeometry(1, 1, 6),
    };
    this.materials = {
      ground: mat("#485f53"),
      stone: mat("#9dada7"),
      dark: mat("#354b4e"),
      wood: mat("#816648"),
      leaf: mat("#638e6c"),
      grass: mat("#99b785"),
      gold: mat("#c9a86d"),
      cyan: mat("#70e6ed", { emissive: "#1a878e", emissiveIntensity: 1 }),
    };
    this.particleMax = 420;
    this.particleData = Array.from({ length: this.particleMax }, () => ({
      life: 0,
    }));
    this.positions = new Float32Array(this.particleMax * 3);
    this.colors = new Float32Array(this.particleMax * 3);
    this.pg = new THREE.BufferGeometry();
    this.pg.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.pg.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    this.pm = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.particles = new THREE.Points(this.pg, this.pm);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
    this.follow = new THREE.Vector3();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.build(1);
  }
  mesh(geo, material, pos, scale, parent = this.env) {
    const m = new THREE.Mesh(this.geo[geo], material);
    m.position.set(...pos);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  build(seed) {
    this.env.traverse((m) => {
      if (m.isInstancedMesh) m.dispose();
      if (m.geometry && !Object.values(this.geo).includes(m.geometry))
        m.geometry.dispose();
    });
    while (this.env.children.length) this.env.remove(this.env.children[0]);
    this.props.clear();
    for (const a of this.temp) {
      a.mesh.parent?.remove(a.mesh);
      a.mesh.geometry.dispose();
      a.mesh.material.dispose();
    }
    this.temp = [];
    for (const m of this.loot.values()) this.disposeGroup(m);
    this.loot.clear();
    this.mesh("box", this.materials.ground, [0, -0.7, 0], [56, 1.4, 17]);
    for (let i = -7; i <= 7; i++) {
      this.mesh(
        "box",
        this.materials.stone,
        [i * 3.7, -0.04, 0],
        [3.4, 0.15, 5.8],
      );
      this.mesh(
        "box",
        this.materials.dark,
        [i * 3.7, -0.01, -3.15],
        [3.55, 0.2, 0.18],
      );
      this.mesh(
        "box",
        this.materials.dark,
        [i * 3.7, -0.01, 3.15],
        [3.55, 0.2, 0.18],
      );
    }
    for (let i = 0; i < 22; i++) {
      const x = Math.sin(i * 32 + seed) * 31,
        z = -10 - Math.abs(Math.cos(i * 14)) * 20;
      this.mesh(
        "box",
        this.materials.dark,
        [x, 2, z],
        [2, 4 + Math.sin(i) * 2, 2],
      );
      this.mesh("sphere", this.materials.stone, [x, 1, z + 2], [2, 2, 2]);
      if (i % 2 === 0) {
        this.mesh("cylinder", this.materials.wood, [x, 3, z], [0.45, 6, 0.45]);
        this.mesh("cone", this.materials.leaf, [x, 7, z], [3.5, 6, 3.5]);
        this.mesh("cone", this.materials.leaf, [x, 9, z], [2.6, 5, 2.6]);
      }
    }
    const grass = new THREE.InstancedMesh(
        this.geo.cone,
        this.materials.grass,
        180,
      ),
      dummy = new THREE.Object3D();
    for (let i = 0; i < 180; i++) {
      dummy.position.set(
        Math.sin(i * 127 + seed) * 27,
        0.3,
        (i % 2 ? 1 : -1) * (4 + Math.abs(Math.sin(i * 12)) * 3),
      );
      dummy.scale.set(0.14, 0.5 + Math.abs(Math.sin(i)), 0.14);
      dummy.rotation.z = Math.sin(i) * 0.2;
      dummy.updateMatrix();
      grass.setMatrixAt(i, dummy.matrix);
    }
    this.env.add(grass);
    for (const x of [-22, -12, 0, 12, 22]) {
      for (const z of [-6, 6]) {
        this.mesh("cylinder", this.materials.stone, [x, 1, z], [0.6, 2, 0.6]);
        this.mesh("box", this.materials.gold, [x, 2, z], [1.4, 0.2, 1.4]);
        this.mesh(
          "sphere",
          this.materials.cyan,
          [x, 2.5, z],
          [0.35, 0.6, 0.35],
        );
      }
    }
    this.portal = new THREE.Group();
    this.portal.position.set(24, 2, 0);
    this.env.add(this.portal);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.17, 8, 36),
      this.materials.cyan,
    );
    this.portal.add(ring);
    this.portal.rotation.y = Math.PI / 2;
    this.mesh("box", this.materials.stone, [24, 0, 0], [3, 0.25, 5]);
    this.beacon = new THREE.PointLight("#5be4ff", 12, 12);
    this.beacon.position.set(23, 3, 0);
    this.env.add(this.beacon);
  }
  actor(e) {
    const group = new THREE.Group(),
      own = [];
    const armor = mat(e.color || "#e5dcbb"),
      cloth = mat(e.id === "player" ? "#316d77" : e.color || "#967766"),
      skin = mat("#cab49b"),
      weapon = mat("#d9f4f0", { metalness: 0.7, roughness: 0.25 });
    own.push(armor, cloth, skin, weapon);
    this.mesh("box", cloth, [0, 1, 0], [0.65, 0.9, 0.4], group);
    this.mesh("sphere", skin, [0, 1.8, 0], [0.29, 0.34, 0.29], group);
    this.mesh("box", armor, [0, 1.3, 0.07], [0.8, 0.45, 0.5], group);
    const legs = [-1, 1].map((s) =>
      this.mesh("box", cloth, [s * 0.2, 0.4, 0], [0.22, 0.8, 0.26], group),
    );
    const arm = new THREE.Group();
    arm.position.set(0.46, 1.35, 0);
    group.add(arm);
    this.mesh("box", armor, [0, -0.2, 0], [0.22, 0.55, 0.22], arm);
    this.mesh("box", weapon, [0, -0.05, 0.65], [0.1, 0.12, 1.35], arm);
    this.mesh(
      "box",
      this.materials.gold,
      [0, -0.05, 0.17],
      [0.42, 0.12, 0.13],
      arm,
    );
    const cape = this.mesh("box", cloth, [0, 1, -0.33], [0.6, 1, 0.08], group);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.57, 24),
      new THREE.MeshBasicMaterial({
        color: e.id === "player" ? "#91edee" : "#c97267",
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.025;
    group.add(halo);
    own.push(halo.material, halo.geometry);
    group.userData = { legs, arm, cape, own, halo };
    if (e.kind === "boss") {
      group.scale.setScalar(2.3);
      this.mesh(
        "cone",
        this.materials.gold,
        [0, 2.25, 0],
        [0.5, 0.6, 0.5],
        group,
      );
    } else if (e.kind === "elite") group.scale.setScalar(1.45);
    this.scene.add(group);
    this.actors.set(e.id, group);
    return group;
  }
  disposeGroup(m) {
    m.parent?.remove(m);
    for (const a of m.userData.own || []) a.dispose();
  }
  prop(p) {
    const group = new THREE.Group();
    group.position.set(p.x, 0, p.z);
    this.env.add(group);
    if (p.material === "stone") {
      this.mesh(
        "cylinder",
        this.materials.stone,
        [0, 1.3, 0],
        [0.6, 2.6, 0.6],
        group,
      );
    } else if (p.type === "crystal") {
      this.mesh(
        "sphere",
        this.materials.cyan,
        [0, 1, 0],
        [0.55, 1, 0.55],
        group,
      );
    } else {
      this.mesh(
        p.type === "barrel" ? "cylinder" : "box",
        this.materials.wood,
        [0, 0.6, 0],
        [1.1, 1.2, 1.1],
        group,
      );
      for (const y of [0.2, 1])
        this.mesh(
          "box",
          this.materials.gold,
          [0, y, 0],
          [1.15, 0.1, 1.15],
          group,
        );
    }
    this.props.set(p.id, group);
  }
  lootMesh(l) {
    const m = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: rarities[l.item.quality][1],
      transparent: true,
      opacity: 0.75,
    });
    this.mesh("sphere", material, [0, 0.4, 0], [0.23, 0.4, 0.23], m);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.18, 3, 6),
      material,
    );
    beam.position.y = 1.5;
    m.add(beam);
    m.userData.own = [material, beam.geometry];
    this.scene.add(m);
    this.loot.set(l.id, m);
    return m;
  }
  burst(type, pos, count = 16) {
    const c = new THREE.Color(
      elements[type] ||
        {
          hit: "#ffe1a3",
          wood: "#a38d70",
          stone: "#aabbaf",
          heal: "#8ff8a0",
          phase: "#e2abff",
          dodge: "#7ddfed",
        }[type] ||
        "#a8f1ee",
    );
    for (let j = 0; j < Math.min(count, this.budget ?? 100); j++) {
      const p = this.particleData.find((p) => p.life <= 0);
      if (!p) break;
      Object.assign(p, {
        x: pos.x,
        y: 1,
        z: pos.z,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 5,
        vz: (Math.random() - 0.5) * 5,
        life: 0.3 + Math.random() * 0.6,
        color: c.clone(),
      });
    }
  }
  update(g, dt) {
    this.clock += dt;
    const actors = [g.player, ...g.enemies];
    const ids = new Set(
      actors.filter((a) => a.hp > 0 || a.id === "player").map((a) => a.id),
    );
    for (const [id, m] of this.actors)
      if (!ids.has(id)) {
        this.disposeGroup(m);
        this.actors.delete(id);
      }
    for (const e of actors) {
      if (e.hp <= 0 && e.id !== "player") continue;
      const m = this.actors.get(e.id) || this.actor(e);
      m.position.set(e.x, 0, e.z);
      m.rotation.y = Math.atan2(e.facing?.x || 0, e.facing?.z || 1);
      const walk = e.moving || e.ai?.destination;
      const swing = Math.sin(this.clock * 10) * 0.55 * (walk ? 1 : 0.08);
      m.userData.legs[0].rotation.x = swing;
      m.userData.legs[1].rotation.x = -swing;
      m.userData.cape.rotation.x = 0.15 + Math.sin(this.clock * 4) * 0.12;
      m.userData.arm.rotation.x = e.attack
        ? Math.sin((e.attack.elapsed / e.attack.duration) * Math.PI * 2) * 2.2
        : e.ai?.state === "Windup"
          ? -1.7
          : Math.sin(this.clock * 2) * 0.04;
      m.rotation.z = e.hp <= 0 ? 1.4 : 0;
      m.position.y = e.dash?.time
        ? Math.sin(e.dash.time * 12) * 0.2
        : Math.abs(swing) * 0.08;
      m.userData.halo.material.opacity = e.invulnerable > 0 ? 0.9 : 0.4;
    }
    for (const p of g.props) {
      if (p.hp > 0 && !this.props.has(p.id)) this.prop(p);
      if (p.hp <= 0 && this.props.has(p.id)) {
        this.env.remove(this.props.get(p.id));
        this.props.delete(p.id);
      }
    }
    const lootIds = new Set(g.loot.map((l) => l.id));
    for (const [id, m] of this.loot)
      if (!lootIds.has(id)) {
        this.disposeGroup(m);
        this.loot.delete(id);
      }
    for (const l of g.loot) {
      const m = this.loot.get(l.id) || this.lootMesh(l);
      m.position.set(
        l.x,
        Math.max(0, Math.sin(Math.min(l.age, 1) * Math.PI) * 1.3) +
          Math.sin(this.clock * 3) * 0.06,
        l.z,
      );
      m.rotation.y = this.clock * 0.8;
    }
    for (const a of this.temp) {
      a.life -= dt;
      if (a.life <= 0) {
        a.mesh.parent?.remove(a.mesh);
        a.mesh.geometry.dispose();
        a.mesh.material.dispose();
      }
    }
    this.temp = this.temp.filter((a) => a.life > 0);
    for (let i = 0; i < this.particleMax; i++) {
      const p = this.particleData[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= 6 * dt;
        p.x += p.vx * dt;
        p.y = Math.max(0.05, p.y + p.vy * dt);
        p.z += p.vz * dt;
        this.positions.set([p.x, p.y, p.z], i * 3);
        this.colors.set([p.color.r, p.color.g, p.color.b], i * 3);
      } else this.positions.set([0, -100, 0], i * 3);
    }
    if (dt > 0 && this.clock - (this.ambientTime || 0) > 0.2) {
      this.ambientTime = this.clock;
      this.burst(
        "wind",
        {
          x: Math.sin(this.clock * 7.3) * 25,
          z: Math.cos(this.clock * 11) * 6,
        },
        2,
      );
    }
    this.pg.attributes.position.needsUpdate = true;
    this.pg.attributes.color.needsUpdate = true;
    this.portal.visible = g.cleared;
    this.portal.rotation.z += dt * 0.2;
    const p = g.player;
    const target = new THREE.Vector3(p.x * 0.72, 1, 0);
    this.follow.lerp(target, 1 - Math.exp(-dt * 4));
    const yaw = g.input?.look.yaw || 0,
      pitch = g.input?.look.pitch || 0;
    const zoom = innerWidth / innerHeight < 1.6 ? 1.15 : 1;
    const desired = new THREE.Vector3(
      this.follow.x + Math.sin(yaw) * 25,
      13 + pitch * 20,
      23 * Math.cos(yaw),
    ).multiplyScalar(zoom);
    desired.x = this.follow.x + Math.sin(yaw) * 25;
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
    if (g.cameraShake > 0)
      this.camera.position.x += (Math.random() - 0.5) * g.cameraShake;
    this.camera.lookAt(this.follow);
    this.renderer.render(this.scene, this.camera);
  }
  ring(pos, radius, color, time) {
    if (this.temp.length > 80) return;
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0.1, radius - 0.12), radius, 40),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.06, pos.z);
    this.scene.add(mesh);
    this.temp.push({ mesh, life: time });
  }
  project(pos) {
    const v = new THREE.Vector3(pos.x, 2.6, pos.z).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * innerWidth,
      y: (-v.y * 0.5 + 0.5) * innerHeight,
    };
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
  settings(s) {
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        { low: 1, medium: 1.4, high: 1.8, ultra: 2 }[s.quality] || 1.4,
      ) * s.scale,
    );
    this.renderer.shadowMap.enabled = s.shadows;
    this.budget = s.particles
      ? { low: 12, medium: 35, high: 65, ultra: 100 }[s.quality]
      : 0;
    this.renderer.toneMappingExposure = s.bloom ? 1.3 : 1.05;
    this.resize();
  }
}
