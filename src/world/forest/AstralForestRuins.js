import { Group, Mesh, TextureLoader, RepeatWrapping, DoubleSide, Color, Vector3, Points, BufferGeometry, Float32BufferAttribute, PointsMaterial } from 'three';
import { createEnvironmentMaterial } from '../../render/EnvironmentMaterial.js';
import { markBloom } from '../../render/PostProcessing.js';
import { surface,branch,rock,arch,leafSpray,terrainHeight } from './geometry.js';
import { assetURL } from '../../assets/manifest.js';
/** Authored environment source, PRODUCTION_ASSET / IN_PROGRESS (art review pending). */
export async function createAstralForest(pipeline){
 const root=new Group();root.name='Astral Forest Ruins';root.userData={assetClass:'PRODUCTION_ASSET',artStatus:'IN_PROGRESS',source:'Original Astral surface authoring'};
 const textures=[];const loader=new TextureLoader();const maps={};
 for(const name of ['baseColor','normal','roughness','ao']){const t=await loader.loadAsync(assetURL(`assets/forest/stone-${name}.png`,import.meta.env?.BASE_URL||'./',location.href));t.wrapS=t.wrapT=RepeatWrapping;textures.push(t);maps[name]=t;}
 const materials={};
 for(const [name,color] of Object.entries({stone:'#abb8aa',earth:'#6f9060',bark:'#71604c',leaf:'#528e5b',lightLeaf:'#93b45f',darkLeaf:'#37664b',crystal:'#68b3cc',gold:'#b8a478'})){
  const m=createEnvironmentMaterial({color,maps:{...maps,detailNormal:maps.normal},detailNormalScale:.08,roughness:name==='crystal'?.28:.88,emissive:name==='crystal'?'#62d8cc':'#000000'});m.name=`Forest:${name}`;m.normalScale.set(.18,.18);m.side=DoubleSide;if(name==='crystal'){m.emissiveIntensity=.55; m.metalness=.22; m.userData.astralBloom=true;}materials[name]=pipeline.trackMaterial(m);
 }
 const meshes=[];let seed=73421;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function add(name,g,mat,pos=[0,0,0],scale=1){const m=new Mesh(g,materials[mat]);m.name=name;m.position.set(...pos);m.scale.setScalar(scale);m.castShadow=true;m.receiveShadow=true;root.add(m);meshes.push(m);return m;}
 const terrain=surface(76,84,(u,v)=>{const x=(u-.5)*78,z=(v-.5)*65;return [x,terrainHeight(x,z),z];});
 const uv=terrain.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*18,uv.getY(i)*18);add('Sculpted forest terrain',terrain,'earth');
 // Broken elliptical courtyard with curved paths and two flank loops.
 for(let ring=0;ring<5;ring++)for(let j=0;j<30+ring*6;j++){if(rand()<.12)continue;const a=j/(30+ring*6)*Math.PI*2,r=2.2+ring*1.5;const x=Math.cos(a)*r*1.35,z=Math.sin(a)*r;add('Weathered courtyard paving',rock(j,[.85,.16,.64]),'stone',[x,.02+rand()*.06,z]).rotation.y=a;}
 for(let i=0;i<35;i++){const z=10+i*.5,x=Math.sin(i*.09)*3;add('Approach flagstone',rock(i,[1.8,.12,.4]),'stone',[x,.04,z]);}
 // Monumental broken astronomical arch, layered masonry and detached fragments.
 for(const [x,z,s,rot] of [[0,-9,1,0],[-12,-4,.66,.5],[13,-8,.62,-.4]]){
  const gate=new Group();gate.position.set(x,0,z);gate.rotation.y=rot;root.add(gate);
  for(const [rad,thick,depth] of [[4,.58,.64],[4.64,.17,.77],[3.77,.15,.74]]){const m=add('Carved astral archivolt',arch(rad,thick,depth,.03,Math.PI*.95),'stone');root.remove(m);gate.add(m);m.position.y=2;m.scale.setScalar(s);}
  for(const side of [-1,1]){const m=add('Fluted gate pier',branch([[side*4.3,0,0],[side*4.3,1,0],[side*4.3,2.7,0]],.56,12),'stone');root.remove(m);gate.add(m);m.scale.setScalar(s);}
  for(let k=0;k<9;k++){const a=k/8*Math.PI;const m=add('Astral inlaid stone',rock(k,[.11,.32,.07]),'gold');root.remove(m);gate.add(m);m.position.set(Math.cos(a)*4.3*s,(2+Math.sin(a)*4.3)*s,.7);m.rotation.z=a-Math.PI/2;}
 }
 for(let i=0;i<26;i++){const a=i*.24;add('Broken perimeter masonry',rock(i,[.85,.4+rand()*.6,.62]),'stone',[Math.cos(a)*11, .5,Math.sin(a)*9-1]);}
 // Trees have swept buttress roots, bent trunks, secondary branches and individual leaf blades.
 const treePositions=[[-16,2],[-20,-9],[-10,-17],[8,-19],[19,-10],[19,5],[-24,14],[25,15],[-27,-21],[29,-23],[-4,-25],[14,-28],[-31,-5]];
 for(let n=0;n<treePositions.length;n++){const [x,z]=treePositions[n],h=9+rand()*6,lean=(rand()-.5)*3;
  const y=terrainHeight(x,z);add('Buttressed elder trunk',branch([[0,0,0],[.2,h*.22,.1],[lean*.5,h*.55,.4],[lean,h*.86,0],[lean+.2,h,0]],.95),'bark',[x,y,z]);
  for(let j=0;j<6;j++){const a=j/6*Math.PI*2;add('Surface root',branch([[0,.8,0],[Math.cos(a)*1.2,.15,Math.sin(a)*1.2],[Math.cos(a)*2.5,0,Math.sin(a)*2.5]],.38),'bark',[x,y,z]);}
  for(let j=0;j<7;j++){const a=j*2.4,reach=2.4+rand()*2,yy=h*(.57+j*.045),dx=Math.cos(a)*reach,dz=Math.sin(a)*reach;add('Swept canopy branch',branch([[lean*.5,yy,0],[dx*.6,yy+1,dz*.6],[dx,yy+1.3,dz]],.27),'bark',[x,y,z]);
   for(let k=0;k<3;k++)add('Individual canopy leaves',leafSpray(n+j+k,2.1),j%2?'leaf':'lightLeaf',[x+dx+(k-1)*.8,y+yy+1.4+k*.32,z+dz]);}
 }
 for(let i=0;i<90;i++){const a=rand()*Math.PI*2,r=12+rand()*21,x=Math.cos(a)*r,z=Math.sin(a)*r;add('Forest boulder',rock(i,[.6+rand()*1.6,.5+rand(),.7+rand()]),'stone',[x,terrainHeight(x,z),z]);}
 const undergrowth=[];for(let i=0;i<240;i++){const x=(rand()-.5)*65,z=(rand()-.5)*54;if(Math.hypot(x/1.4,z)<9||Math.abs(x-Math.sin((z-10)*.18)*3)<2.2&&z>9)continue;const m=add('Fern and ground leaves',leafSpray(i,.45+rand()*.65),i%3?'leaf':'darkLeaf',[x,terrainHeight(x,z)+.13,z]);undergrowth.push(m);}
 for(const [x,z] of [[0,-6],[-9,1],[10,3]])for(let i=0;i<5;i++){const m=add('Astral crystal formation',rock(i,[.3,.8+rand(),.3]),'crystal',[x+(rand()-.5)*1.4,.7,z+(rand()-.5)*1.3]);m.rotation.z=(rand()-.5)*.7;markBloom(m);}
 for(let i=0;i<17;i++){const a=i/16*Math.PI;add('Distant mountain ridge',rock(i,[8,5+rand()*10,6]),'darkLeaf',[Math.cos(a)*52,2,-30-Math.sin(a)*20]);}
 const particles=new BufferGeometry(),p=[];for(let i=0;i<80;i++)p.push((rand()-.5)*44,rand()*9,(rand()-.5)*35);particles.setAttribute('position',new Float32BufferAttribute(p,3));const dust=new Points(particles,new PointsMaterial({color:'#f4e4ad',size:.065,transparent:true,opacity:.5,depthWrite:false}));root.add(dust);
 pipeline.scene.add(root);pipeline.scene.background=new Color('#b1c7ba');pipeline.scene.fog.color.copy(pipeline.scene.background);pipeline.scene.fog.density=.009;
 pipeline.camera.position.set(20,15,29);pipeline.camera.lookAt(0,3,-4);pipeline.lighting.follow(new Vector3(0,0,-3));pipeline.post.bloom.strength=.28;
 const quality=p=>{undergrowth.forEach((m,i)=>m.visible=i/undergrowth.length<p.grassDensity);};pipeline.visualClients.add(quality);quality(pipeline.profile);
 return {root,meshes,materials,update(dt){dust.rotation.y+=dt*.006;pipeline.render(dt);},dispose(){pipeline.visualClients.delete(quality);root.removeFromParent();for(const m of meshes)m.geometry.dispose();for(const m of Object.values(materials))m.dispose();textures.forEach(t=>t.dispose());particles.dispose();dust.material.dispose();}};
}
