import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAstralForest } from './AstralForestRuins.js';
export async function createForestReview(pipeline){
 const forest=await createAstralForest(pipeline);
 const controls=new OrbitControls(pipeline.camera,pipeline.renderer.domElement);controls.target.set(0,3,-4);controls.minDistance=12;controls.maxDistance=60;controls.maxPolarAngle=Math.PI*.47;controls.enableDamping=true;
 const panel=document.createElement('div');panel.className='forest-review';
 const heading=document.createElement('h1');heading.textContent='ASTRAL FOREST RUINS';
 const sub=document.createElement('p');sub.textContent='V2-B · 环境制作中 / ART REVIEW PENDING';panel.append(heading,sub);
 const views=[[20,15,29],[0,7,19],[-12,6,12]];
 const view=i=>{pipeline.camera.position.set(...views[i]);controls.target.set(0,i===1?3:2,-4);controls.update();pipeline.render(0);};
 ['庭院全景','星门近景','侧翼林地'].forEach((label,i)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>view(i);panel.append(b);});
 const qa=document.createElement('a');qa.href='?qa=1';qa.textContent='Renderer QA';panel.append(qa);document.body.append(panel);
 const badge=document.createElement('div');badge.id='asset-status';badge.textContent='PRODUCTION_ASSET · IN_PROGRESS · CHARACTER TODO · REAL_DEVICE_NOT_VERIFIED';document.body.append(badge);
 if(new URLSearchParams(location.search).get('review')==='1')window.__ASTRAL_ENV__={ready:true,view,stats:()=>({assetClass:forest.root.userData.assetClass,artStatus:forest.root.userData.artStatus,meshes:forest.meshes.length,primitiveMeshes:forest.meshes.filter(m=>['BoxGeometry','ConeGeometry','PlaneGeometry'].includes(m.geometry.type)).length,programs:pipeline.renderer.info.programs.map(p=>{const gl=pipeline.renderer.getContext();return {name:p.name,linked:gl.getProgramParameter(p.program,gl.LINK_STATUS)};}),triangles:pipeline.renderer.info.render.triangles})};
 return {update(dt){controls.update();forest.update(dt);pipeline.sample(dt,{active:!document.hidden});},dispose(){controls.dispose();forest.dispose();panel.remove();badge.remove();delete window.__ASTRAL_ENV__;}};
}
