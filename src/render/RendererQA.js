import { Mesh, SphereGeometry, PlaneGeometry, MeshStandardMaterial, Vector3 } from 'three';
import { QA_MANIFEST } from '../assets/manifest.js';
import { markBloom } from './PostProcessing.js';
export async function createRendererQA(pipeline, assets) {
  const report = await assets.loadManifest(QA_MANIFEST);
  if (!report.ready) throw new Error(JSON.stringify(report.records));
  const instances = report.records.map(r => assets.instantiate(r, pipeline));
  instances.forEach((item, i) => {
    item.root.position.set(i ? 2 : -2, 0, 0);
    pipeline.scene.add(item.root);
    item.mixer.clipAction(item.clips.get('Idle')).play();
  });
  const ground = new Mesh(new PlaneGeometry(40, 40), new MeshStandardMaterial({color: '#36444d', roughness: .9}));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.05; ground.receiveShadow = true;
  pipeline.scene.add(ground);
  const markers = [-4, 4].map((x, i) => {
    const mesh = new Mesh(new SphereGeometry(.42, 24, 16), new MeshStandardMaterial({color: '#a8ffff', emissive: '#75ffff', emissiveIntensity: 7}));
    mesh.position.set(x, 1.2, 2); if (!i) markBloom(mesh);
    pipeline.scene.add(mesh); return mesh;
  });
  pipeline.camera.position.set(0, 5, 14); pipeline.camera.lookAt(0, 1, 0);
  pipeline.post.bloom.strength = 1.4;
  let frozen = false;
  const render = (dt=0) => { instances.forEach(i => i.mixer.update(dt)); pipeline.render(dt); };
  const api = {
    ready: true, assetClass: 'QA_ASSET', productionArtAccepted: false,
    freeze() { frozen = true; render(); },
    step(dt) { render(dt); return instances[0].root.getObjectByName('QA_Tip').quaternion.toArray(); },
    bloom(enabled) { pipeline.post.bloomEnabled=enabled; pipeline.post.combine.uniforms.bloomAmount.value=enabled?1:0; render(); },
    lighting(enabled) { for(const light of [pipeline.lighting.key,pipeline.lighting.fill,pipeline.lighting.sky,pipeline.lighting.rim]) light.visible=enabled; render(); },
    stats() {
      const gl=pipeline.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
      return {context:!!gl, renderer: ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER), vendor:gl.getParameter(gl.VENDOR), glError:gl.getError(), programs:pipeline.renderer.info.programs.map(p=>({name:p.name,runnable:gl.getProgramParameter(p.program,gl.LINK_STATUS), vertexCompiled:gl.getShaderParameter(p.vertexShader,gl.COMPILE_STATUS), fragmentCompiled:gl.getShaderParameter(p.fragmentShader,gl.COMPILE_STATUS)})), calls:pipeline.renderer.info.render.calls, triangles:pipeline.renderer.info.render.triangles, bones:instances[0].root.getObjectByName('QA_Skinned').skeleton.bones.length, materials:[...pipeline.materials].map(m=>m.name), markerPixels:markers.map(m=>{const v=m.position.clone().project(pipeline.camera);return {x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2};}), realDevice:'REAL_DEVICE_NOT_VERIFIED'};
    }
  };
  window.__ASTRAL_QA__=api;
  return { instances, update(dt){if(!frozen)render(dt);}, dispose(){delete window.__ASTRAL_QA__;ground.geometry.dispose();ground.material.dispose();for(const m of markers){m.geometry.dispose();m.material.dispose();} } };
}
