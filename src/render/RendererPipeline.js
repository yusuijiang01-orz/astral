import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { LightingRig } from "./LightingRig.js";
import { PostProcessing } from "./PostProcessing.js";
import { QualityManager } from "./QualityManager.js";

/** Single renderer owner, also responsible for resize, telemetry and GPU teardown. */
export class RendererPipeline {
  constructor(canvas) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(42, 1, 0.1, 180);
    this.camera.position.set(0, 12, 23);
    this.camera.lookAt(0, 1, 0);
    this.lighting = new LightingRig(this.scene);
    this.post = new PostProcessing(this.renderer, this.scene, this.camera);
    this.materials = new Set();
    this.visualClients = new Set();
    this.quality = new QualityManager((p) => this.applyQuality(p));
    this.onResize = () => this.resize();
    window.addEventListener("resize", this.onResize);
    this.quality.configure({});
  }
  trackMaterial(material) {
    this.materials.add(material);
    material.addEventListener("dispose", () => this.materials.delete(material));
    return material;
  }
  applyQuality(profile) {
    this.profile = profile;
    this.renderer.shadowMap.enabled = profile.shadows;
    this.lighting.quality(profile.shadow, profile.shadows);
    this.post.configure(profile);
    this.resize();
    for (const callback of this.visualClients) callback(profile);
  }
  settings(settings) {
    this.quality.configure(settings);
  }
  resize() {
    const width = Math.max(1, window.innerWidth),
      height = Math.max(1, window.innerHeight);
    const p = this.profile || this.quality.profile();
    const ratio = Math.min(window.devicePixelRatio || 1, p.dpr) * p.scale;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.post.resize(width, height, ratio);
  }
  render(dt) {
    this.renderer.info.reset();
    this.camera.updateMatrixWorld();
    for (const material of this.materials)
      material.updateLight?.(this.camera, this.lighting.keyDirection);
    this.post.render(dt);
  }
  sample(dt, { active = true, activeParticles = 0, activeEnemies = 0 } = {}) {
    return this.quality.sample(
      dt,
      {
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        activeParticles,
        activeEnemies,
      },
      active,
    );
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("resize", this.onResize);
    this.post.dispose();
    this.lighting.dispose();
    for (const m of [...this.materials]) m.dispose();
    this.materials.clear();
    this.visualClients.clear();
    this.renderer.dispose();
  }
}
