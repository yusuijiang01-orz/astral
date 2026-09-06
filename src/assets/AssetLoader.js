import { AnimationMixer, LoadingManager } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  DRACOLoader,
  DRACO_GLTF_CONFIG,
} from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { AnimeMaterial } from "../render/AnimeMaterial.js";
import { createEnvironmentMaterial } from "../render/EnvironmentMaterial.js";
import { assetURL } from "./manifest.js";

export function inspectAsset(gltf, contract) {
  const errors = [];
  const nodes = new Set();
  let skinned = false,
    meshes = 0;
  const maps = new Set();
  gltf.scene?.traverse((o) => {
    nodes.add(o.name);
    if (o.isSkinnedMesh) skinned = true;
    if (o.isMesh) {
      meshes++;
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        for (const key of ["map", "normalMap", "roughnessMap", "aoMap"])
          if (m?.[key]) maps.add(key);
    }
  });
  if (!meshes) errors.push("no renderable mesh");
  if (contract.skinned && !skinned) errors.push("missing skeleton");
  const clips = new Set((gltf.animations || []).map((a) => a.name));
  for (const name of contract.requiredClips || [])
    if (!clips.has(name)) errors.push(`animation:${name}`);
  for (const name of contract.requiredNodes || [])
    if (!nodes.has(name)) errors.push(`node:${name}`);
  for (const name of contract.requiredMaps || [])
    if (!maps.has(name)) errors.push(`texture:${name}`);
  return errors;
}
export function disposeAsset(gltf) {
  const resources = new Set();
  gltf.scene?.traverse((o) => {
    if (o.geometry) resources.add(o.geometry);
    if (o.skeleton) resources.add(o.skeleton);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m) {
        resources.add(m);
        for (const v of Object.values(m)) if (v?.isTexture) resources.add(v);
      }
  });
  for (const r of resources) r.dispose?.();
}
/** Owns source GLTF resources; clones share geometry/textures but own materials/mixers. */
export class AssetLoader {
  constructor(
    renderer,
    {
      base = import.meta.env?.BASE_URL || "./",
      documentURL = globalThis.location?.href || "http://localhost/",
      timeoutMs = 15000,
      transport = null,
    } = {},
  ) {
    this.base = base;
    this.documentURL = documentURL;
    this.timeoutMs = timeoutMs;
    this.cache = new Map();
    this.disposed = false;
    this.manager = new LoadingManager();
    this.draco = new DRACOLoader(this.manager);
    this.ktx2 = new KTX2Loader(this.manager);
    this.draco.setDecoderPath(DRACO_GLTF_CONFIG);
    this.draco.setWorkerLimit(2);
    // r185 resolves Basis files relative to its module; Vite emits local hashed assets.
    this.ktx2.setWorkerLimit(2);
    if (renderer) this.ktx2.detectSupport(renderer);
    this.gltf = new GLTFLoader(this.manager)
      .setDRACOLoader(this.draco)
      .setKTX2Loader(this.ktx2);
    this.transport = transport || ((url) => this.gltf.loadAsync(url));
  }
  async load(key, contract) {
    if (this.disposed)
      return { key, status: "BLOCKED_BY_ASSET", reason: "loader disposed" };
    if (!contract?.path || !contract.license)
      return {
        key,
        status: "BLOCKED_BY_ASSET",
        reason: "正式资产及来源授权尚未提供",
      };
    let url;
    try {
      url = assetURL(contract.path, this.base, this.documentURL);
    } catch (error) {
      return { key, status: "BLOCKED_BY_ASSET", reason: error.message };
    }
    const cacheKey = JSON.stringify([key, url, contract]);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    const task = (async () => {
      let timer,
        expired = false;
      const pending = Promise.resolve().then(() => this.transport(url));
      pending.then(
        (asset) => {
          if (expired || this.disposed) disposeAsset(asset);
        },
        () => {},
      );
      try {
        const gltf = await Promise.race([
          pending,
          new Promise((_, reject) => {
            timer = setTimeout(() => {
              expired = true;
              reject(new Error("asset timeout"));
            }, this.timeoutMs);
          }),
        ]);
        if (this.disposed) throw new Error("loader disposed");
        const errors = inspectAsset(gltf, contract);
        if (errors.length) {
          disposeAsset(gltf);
          return { key, status: "BLOCKED_BY_ASSET", reason: errors.join(", ") };
        }
        return { key, status: "READY", gltf, contract };
      } catch (error) {
        return { key, status: "BLOCKED_BY_ASSET", reason: error.message };
      } finally {
        clearTimeout(timer);
      }
    })();
    this.cache.set(cacheKey, task);
    return task;
  }
  async loadManifest(manifest) {
    const records = await Promise.all(
      Object.entries(manifest).map(([key, c]) => this.load(key, c)),
    );
    return { ready: records.every((r) => r.status === "READY"), records };
  }
  instantiate(record, pipeline) {
    if (record.status !== "READY")
      throw new Error("Cannot instantiate blocked asset");
    const root = clone(record.gltf.scene);
    root.userData.assetClass = record.contract.assetClass || "PRODUCTION_ASSET";
    const owned = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const convert = (source) => {
        const type = source.userData?.astralType || "cloth";
        let m;
        if (record.contract.kind === "character")
          m = new AnimeMaterial({
            type,
            color: source.color,
            map: source.map,
            normalMap: source.normalMap,
            roughnessMap: source.roughnessMap,
            aoMap: source.aoMap,
            emissiveMap: source.emissiveMap,
            emissive: source.emissive,
          });
        else
          m = createEnvironmentMaterial({
            color: source.color,
            maps: {
              baseColor: source.map,
              normal: source.normalMap,
              roughness: source.roughnessMap,
              ao: source.aoMap,
              emissive: source.emissiveMap,
            },
            emissive: source.emissive,
          });
        m.side = source.side;
        m.transparent = source.transparent;
        m.opacity = source.opacity;
        m.alphaTest = source.alphaTest;
        if (source.userData?.astralBloom) m.userData.astralBloom = true;
        owned.push(m);
        pipeline?.trackMaterial(m);
        return m;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(convert)
        : convert(o.material);
    });
    const mixer = new AnimationMixer(root);
    const clips = new Map(record.gltf.animations.map((c) => [c.name, c]));
    return {
      root,
      mixer,
      clips,
      dispose() {
        mixer.stopAllAction();
        mixer.uncacheRoot(root);
        root.removeFromParent();
        root.traverse((o) => o.skeleton?.dispose());
        for (const m of owned) m.dispose();
      },
    };
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const pending of this.cache.values()) {
      const r = await pending;
      if (r.gltf) disposeAsset(r.gltf);
    }
    this.cache.clear();
    this.draco.dispose();
    this.ktx2.dispose();
  }
}
