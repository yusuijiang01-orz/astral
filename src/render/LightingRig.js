import {
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  PointLight,
  Vector3,
} from "three";

export class LightingRig {
  constructor(scene) {
    this.scene = scene;
    this.group = new Group();
    this.group.name = "AstralLightingRig";
    this.key = new DirectionalLight("#fff0ce", 2.5);
    this.key.position.set(-12, 23, 15);
    this.key.castShadow = true;
    Object.assign(this.key.shadow.camera, {
      left: -30,
      right: 30,
      top: 25,
      bottom: -25,
      near: 1,
      far: 95,
    });
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.035;
    this.fill = new DirectionalLight("#a3bde4", 0.5);
    this.fill.position.set(16, 8, -12);
    this.sky = new HemisphereLight("#d4e5ed", "#5b6559", 1.05);
    this.rim = new DirectionalLight("#d9def8", 0.55);
    this.rim.position.set(1, 10, -20);
    this.magic = new PointLight("#91ceff", 0, 9, 2);
    this.magic.position.set(0, 2, 0);
    this.group.add(
      this.key,
      this.key.target,
      this.fill,
      this.sky,
      this.rim,
      this.magic,
    );
    scene.add(this.group);
    scene.background = new Color("#a4bbc4");
    scene.fog = new FogExp2("#a4bbc4", 0.014);
    this.keyDirection = this.key.position.clone().normalize();
    this.offset = new Vector3(-12, 23, 15);
  }
  follow(position) {
    this.key.target.position.set(position.x, 0, position.z || 0);
    this.key.position.copy(this.key.target.position).add(this.offset);
  }
  quality(size, enabled = true) {
    this.key.castShadow = enabled;
    if (this.key.shadow.mapSize.x !== size) {
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
      this.key.shadow.mapPass?.dispose();
      this.key.shadow.mapPass = null;
      this.key.shadow.mapSize.set(size, size);
    }
  }
  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => {
      if (o.isLight) o.dispose();
    });
  }
}
