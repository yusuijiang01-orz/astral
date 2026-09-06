import test from "node:test";
import assert from "node:assert/strict";
import {
  AnimationClip,
  Bone,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  PerspectiveCamera,
  Scene,
  ShaderLib,
  Skeleton,
  SkinnedMesh,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Texture,
  Vector3,
} from "three";
import { QualityManager } from "../src/render/QualityManager.js";
import {
  AnimeMaterial,
  MATERIAL_PROFILES,
} from "../src/render/AnimeMaterial.js";
import {
  BloomSelection,
  isBloomSelected,
  markBloom,
} from "../src/render/PostProcessing.js";
import { LightingRig } from "../src/render/LightingRig.js";
import {
  AssetLoader,
  inspectAsset,
  disposeAsset,
} from "../src/assets/AssetLoader.js";
import {
  ASSET_MANIFEST,
  assetURL,
  debugAssetsEnabled,
  PLAYER_CLIPS,
} from "../src/assets/manifest.js";
import { WorldView } from "../src/world/scene.js";

function fixture() {
  const scene = new Group();
  scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
  return { scene, animations: [] };
}
test("Prototype is opt-in and rejected before any GPU allocation", () => {
  assert.equal(debugAssetsEnabled(""), false);
  assert.equal(debugAssetsEnabled("?debugAssets=0"), false);
  assert.equal(debugAssetsEnabled("?debugAssets=true"), false);
  assert.equal(debugAssetsEnabled("?debugAssets=1"), true);
  assert.throws(() => new WorldView(null), /PROTOTYPE_ASSETS_DISABLED/);
});
test("Formal manifest reports blockers without fake successful network requests", async () => {
  let loads = 0;
  const loader = new AssetLoader(null, {
    transport: async () => {
      loads++;
      return fixture();
    },
  });
  const report = await loader.loadManifest(ASSET_MANIFEST);
  assert.equal(report.ready, false);
  assert.equal(loads, 0);
  assert(report.records.every((r) => r.status === "BLOCKED_BY_ASSET"));
  await loader.dispose();
});
test("GLTF loading caches success and checks each asset contract independently", async () => {
  let loads = 0;
  const loader = new AssetLoader(null, {
    transport: async () => {
      loads++;
      return fixture();
    },
  });
  const c = {
    path: "assets/test.glb",
    license: "test-only",
    kind: "environment",
  };
  const [a, b] = await Promise.all([loader.load("a", c), loader.load("a", c)]);
  assert.equal(a, b);
  assert.equal(a.status, "READY");
  assert.equal(loads, 1);
  const bad = await loader.load("b", { ...c, skinned: true });
  assert.equal(bad.status, "BLOCKED_BY_ASSET");
  assert.match(bad.reason, /skeleton/);
  await loader.dispose();
});
test("Failed and slow assets return explicit blockers, late resources are freed", async () => {
  let disposed = 0;
  const late = fixture();
  late.scene.children[0].geometry.addEventListener("dispose", () => disposed++);
  const loader = new AssetLoader(null, {
    timeoutMs: 5,
    transport: () =>
      new Promise((resolve) => setTimeout(() => resolve(late), 15)),
  });
  const result = await loader.load("slow", { path: "a.glb", license: "test" });
  assert.equal(result.status, "BLOCKED_BY_ASSET");
  assert.match(result.reason, /timeout/);
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(disposed, 1);
  await loader.dispose();
  const failure = new AssetLoader(null, {
    transport: async () => {
      throw Error("404");
    },
  });
  assert.equal(
    (await failure.load("a", { path: "a.glb", license: "test" })).status,
    "BLOCKED_BY_ASSET",
  );
  await failure.dispose();
});
test("Formal rig contract requires skeleton, named clips, weapon and texture maps", () => {
  const f = fixture();
  const missing = inspectAsset(f, ASSET_MANIFEST.player);
  assert(missing.some((s) => s.includes("skeleton")));
  assert.equal(missing.filter((s) => s.startsWith("animation")).length, 14);
  assert(missing.includes("node:Weapon"));
  const mesh = f.scene.children[0];
  for (const key of ["map", "normalMap", "roughnessMap", "aoMap"])
    mesh.material[key] = new Texture();
  assert.deepEqual(inspectAsset(f, ASSET_MANIFEST.environment), []);
  disposeAsset(f);
});
test("Loaded rig clones have independent skeleton/mixer and bound stylized materials", async () => {
  const root = new Group(),
    geometry = new BoxGeometry();
  const count = geometry.attributes.position.count;
  geometry.setAttribute(
    "skinIndex",
    new Uint16BufferAttribute(new Uint16Array(count * 4), 4),
  );
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));
  const skin = new SkinnedMesh(geometry, new MeshStandardMaterial());
  const bone = new Bone();
  bone.name = "Weapon";
  skin.add(bone);
  skin.bind(new Skeleton([bone]));
  root.add(skin);
  const gltf = {
    scene: root,
    animations: PLAYER_CLIPS.map(
      (name) =>
        new AnimationClip(name, 1, [
          new NumberKeyframeTrack(".rotation[y]", [0, 1], [0, 1]),
        ]),
    ),
  };
  const loader = new AssetLoader(null, { transport: async () => gltf });
  const record = await loader.load("rig", {
    ...ASSET_MANIFEST.player,
    path: "rig.glb",
    license: "test fixture",
  });
  assert.equal(record.status, "READY");
  const a = loader.instantiate(record),
    b = loader.instantiate(record);
  assert(a.root.children[0].material instanceof AnimeMaterial);
  assert.notEqual(a.root.children[0].skeleton, b.root.children[0].skeleton);
  a.mixer.clipAction(a.clips.get("Idle")).play();
  a.mixer.update(0.5);
  assert(a.root.rotation.y > 0);
  assert.equal(b.root.rotation.y, 0);
  a.dispose();
  b.dispose();
  await loader.dispose();
});
test("Pages subpaths resolve relative GLB URLs and reject host-root paths", () => {
  assert.equal(
    assetURL(
      "assets/player.glb",
      "./",
      "https://example.github.io/astral/?debugAssets=1",
    ),
    "https://example.github.io/astral/assets/player.glb",
  );
  assert.throws(() => assetURL("/assets/player.glb"));
  assert.throws(() => assetURL("../other.glb"));
});
test("Quality degrades visuals after sustained low FPS without changing saved settings", () => {
  const settings = Object.freeze({ quality: "high", scale: 1 });
  const applied = [];
  const q = new QualityManager((p) => applied.push(p));
  q.configure(settings);
  const initial = q.profile();
  for (let i = 0; i < 180; i++)
    q.sample(1 / 30, { activeEnemies: 20, activeParticles: 100 });
  assert(q.profile().grassDensity < initial.grassDensity);
  assert.equal(q.profile().particleDensity, initial.particleDensity);
  assert.equal(q.metrics.activeEnemies, 20);
  assert.equal(settings.scale, 1);
  assert(q.metrics.frameMs > 30);
  assert(applied.length > 1);
});
test("Pause and long background frames do not trigger quality degradation", () => {
  const q = new QualityManager();
  q.configure({ quality: "medium" });
  for (let i = 0; i < 500; i++) {
    q.sample(0.1, {}, false);
    q.sample(2, {}, true);
  }
  assert.equal(q.step, 0);
  for (let i = 0; i < 180; i++) q.sample(1 / 30);
  assert(q.step > 0);
  for (let i = 0; i < 1400; i++) q.sample(1 / 60);
  assert.equal(q.step, 0);
});
test("Selective bloom excludes a bright white surface and restores on render failure", () => {
  const scene = new Scene();
  scene.background = new Color("#123456");
  const plain = new Mesh(
    new BoxGeometry(),
    new MeshStandardMaterial({ color: "white" }),
  );
  const magic = markBloom(
    new Mesh(
      new BoxGeometry(),
      new MeshStandardMaterial({ emissive: "white" }),
    ),
  );
  scene.add(plain, magic);
  const source = plain.material,
    glow = magic.material,
    background = scene.background;
  const mask = new BloomSelection();
  assert.equal(isBloomSelected(plain), false);
  assert.equal(isBloomSelected(magic), true);
  assert.throws(
    () =>
      mask.render(scene, () => {
        assert.equal(plain.material.color.getHex(), 0);
        assert.equal(magic.material, glow);
        throw Error("GPU failure");
      }),
    /GPU failure/,
  );
  assert.equal(plain.material, source);
  assert.equal(scene.background, background);
  mask.dispose();
  disposeAsset({ scene });
});
test("Character profiles preserve PBR distinctions and update light with camera direction", () => {
  const metal = new AnimeMaterial({ type: "metal" }),
    cloth = new AnimeMaterial({ type: "cloth" });
  assert(metal.metalness > cloth.metalness);
  assert(metal.roughness < cloth.roughness);
  const camera = new PerspectiveCamera();
  camera.rotation.y = 0.5;
  camera.updateMatrixWorld();
  metal.updateLight(camera, new Vector3(0, 0, 1));
  assert(Math.abs(metal.astralUniforms.astralKeyView.value.x) > 0.1);
  const shader = {
    uniforms: {},
    fragmentShader: ShaderLib.standard.fragmentShader,
    vertexShader: ShaderLib.standard.vertexShader,
  };
  metal.onBeforeCompile(shader);
  assert.equal(shader.uniforms.astralRim, metal.astralUniforms.astralRim);
  assert.equal(Object.keys(MATERIAL_PROFILES).length, 7);
  metal.dispose();
  cloth.dispose();
});
test("Lighting preserves shadows at low quality and releases changed shadow targets", () => {
  const scene = new Scene();
  const rig = new LightingRig(scene);
  let disposed = 0;
  rig.key.shadow.mapSize.set(1024, 1024);
  rig.key.shadow.map = {
    dispose() {
      disposed++;
    },
  };
  rig.quality(512, true);
  assert.equal(disposed, 1);
  assert.equal(rig.key.castShadow, true);
  rig.follow({ x: 12, z: -3 });
  assert.equal(rig.key.target.position.x, 12);
  assert.equal(rig.key.target.position.z, -3);
  rig.dispose();
  assert.equal(scene.children.length, 0);
});
test("Bloom material groups do not admit an unmarked bright material", () => {
  const scene = new Scene(),
    a = new MeshStandardMaterial({ color: "white" }),
    b = new MeshStandardMaterial({ emissive: "white" });
  b.userData.astralBloom = true;
  const object = new Mesh(new BoxGeometry(), [a, b]);
  scene.add(object);
  const mask = new BloomSelection();
  mask.render(scene, () => {
    assert.equal(object.material[0].color.getHex(), 0);
    assert.equal(object.material[1], b);
  });
  assert.equal(object.material[0], a);
  mask.dispose();
  disposeAsset({ scene });
});
test("Real GLTFLoader parses an embedded GLB through the asset pipeline", async () => {
  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
  };
  const raw = new TextEncoder().encode(JSON.stringify(json));
  const size = Math.ceil(raw.length / 4) * 4;
  const buffer = new ArrayBuffer(12 + 8 + size + 8 + 36),
    view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, size, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, size).fill(32);
  new Uint8Array(buffer, 20, raw.length).set(raw);
  view.setUint32(20 + size, 36, true);
  view.setUint32(24 + size, 0x004e4942, true);
  new Float32Array(buffer, 28 + size, 9).set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const loader = new AssetLoader(null);
  loader.transport = () => loader.gltf.parseAsync(buffer, "");
  const r = await loader.load("fixture", {
    path: "test.glb",
    license: "test-only",
  });
  assert.equal(r.status, "READY");
  let count = 0;
  r.gltf.scene.traverse((o) => {
    if (o.isMesh) count += o.geometry.attributes.position.count;
  });
  assert.equal(count, 3);
  await loader.dispose();
});
