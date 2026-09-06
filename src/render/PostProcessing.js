import { Color, MeshBasicMaterial, Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

const FULLSCREEN_VERTEX =
  "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}";
export function markBloom(object, enabled = true) {
  object.userData.astralBloom = enabled;
  return object;
}
export function isBloomSelected(object) {
  for (let p = object; p; p = p.parent)
    if (p.userData?.astralBloom) return true;
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];
  return materials.some((m) => m?.userData?.astralBloom);
}

/** Temporarily blacken unselected surfaces while retaining depth occlusion. */
export class BloomSelection {
  constructor() {
    this.black = new Map();
  }
  blackMaterial(source) {
    if (!this.black.has(source)) {
      const m = new MeshBasicMaterial({
        color: 0,
        side: source.side,
        alphaMap: source.alphaMap,
        map: source.map,
        alphaTest: source.alphaTest,
        transparent: source.transparent,
        opacity: source.opacity,
        depthWrite: source.depthWrite,
      });
      this.black.set(source, m);
      source.addEventListener(
        "dispose",
        () => {
          m.dispose();
          this.black.delete(source);
        },
        { once: true },
      );
    }
    return this.black.get(source);
  }
  render(scene, callback) {
    const restored = [];
    const background = scene.background;
    const fog = scene.fog;
    const fogColor = fog?.color.clone();
    try {
      scene.background = new Color(0);
      if (fog) fog.color.set(0);
      scene.traverse((object) => {
        if (!object.material) return;
        let wholeObject = false;
        for (let p = object; p; p = p.parent)
          if (p.userData?.astralBloom) wholeObject = true;
        if (wholeObject) return;
        if (object.isMesh) {
          restored.push([object, object.material, null]);
          const select = (m) =>
            m.userData?.astralBloom ? m : this.blackMaterial(m);
          object.material = Array.isArray(object.material)
            ? object.material.map(select)
            : select(object.material);
        } else {
          restored.push([object, null, object.visible]);
          object.visible = false;
        }
      });
      callback();
    } finally {
      for (const [o, m, visible] of restored) {
        if (m) o.material = m;
        else o.visible = visible;
      }
      scene.background = background;
      if (fog && fogColor) fog.color.copy(fogColor);
    }
  }
  dispose() {
    for (const m of this.black.values()) m.dispose();
    this.black.clear();
  }
}

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.scene = scene;
    this.mask = new BloomSelection();
    this.bloomEnabled = true;
    this.bloomComposer = new EffectComposer(renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomRender = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.35, 0.8);
    this.bloomComposer.addPass(this.bloomRender);
    this.bloomComposer.addPass(this.bloom);
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.combine = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: this.bloom.renderTargetsHorizontal[0].texture },
        bloomAmount: { value: 1 },
        vignette: { value: 0.16 },
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: `
      uniform sampler2D tDiffuse; uniform sampler2D tBloom; uniform float bloomAmount; uniform float vignette; varying vec2 vUv;
      void main(){
        vec3 c=texture2D(tDiffuse,vUv).rgb+texture2D(tBloom,vUv).rgb*bloomAmount;
        float l=dot(c,vec3(.2126,.7152,.0722));
        c=mix(vec3(l),c,1.035);
        c*=mix(vec3(.96,.985,1.025),vec3(1.035,1.01,.975),smoothstep(.12,1.2,l));
        float edge=smoothstep(.2,.72,length(vUv-.5));
        gl_FragColor=vec4(c*(1.0-edge*vignette),1.0);
      }`,
    });
    // ShaderPass clones input uniforms, including Texture objects. Rebind the live
    // render-target texture or the final pass samples an unrendered clone.
    this.combine.uniforms.tBloom.value = this.bloom.renderTargetsHorizontal[0].texture;
    this.output = new OutputPass();
    this.fxaa = new ShaderPass(FXAAShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.combine);
    this.composer.addPass(this.output);
    this.composer.addPass(this.fxaa);
  }
  configure(profile) {
    this.bloomEnabled = profile.bloom;
    this.combine.uniforms.bloomAmount.value = profile.bloom ? 1 : 0;
    this.fxaa.enabled = profile.aa;
    this.bloomScale = profile.bloomScale;
  }
  resize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.bloomComposer.setPixelRatio(pixelRatio * (this.bloomScale || 0.5));
    this.bloomComposer.setSize(width, height);
    this.fxaa.uniforms.resolution.value.set(
      1 / (width * pixelRatio),
      1 / (height * pixelRatio),
    );
  }
  render(dt) {
    if (this.bloomEnabled)
      this.mask.render(this.scene, () => this.bloomComposer.render(dt));
    this.composer.render(dt);
  }
  dispose() {
    for (const pass of [
      this.bloomRender,
      this.bloom,
      this.renderPass,
      this.combine,
      this.output,
      this.fxaa,
    ])
      pass.dispose?.();
    this.bloomComposer.dispose();
    this.composer.dispose();
    this.mask.dispose();
  }
}
