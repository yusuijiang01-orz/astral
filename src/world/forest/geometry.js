import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
// Original surface authoring tools: no primitive tree/ground replacement meshes.
export function surface(rows, columns, vertex, wrap=false) {
  const p=[],uv=[],indices=[];
  for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){p.push(...vertex(x/columns,y/rows));uv.push(x/columns,y/rows);}
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function branch(points,radius,segments=8){
 const ps=points.map(p=>new Vector3(...p));
 return surface(ps.length-1,segments,(u,v)=>{const i=Math.min(ps.length-1,Math.round(v*(ps.length-1))),p=ps[i];const t=ps[Math.min(i+1,ps.length-1)].clone().sub(ps[Math.max(0,i-1)]).normalize();const side=new Vector3(0,0,1).cross(t).normalize(),up=t.clone().cross(side);const r=radius*Math.pow(1-v*.92,.8)*(1+.09*Math.sin(u*Math.PI*12));return p.clone().addScaledVector(side,Math.cos(u*Math.PI*2)*r).addScaledVector(up,Math.sin(u*Math.PI*2)*r).toArray();});
}
export function rock(seed,scale=[1,1,1]){
 return surface(7,11,(u,v)=>{const a=u*Math.PI*2,b=v*Math.PI;const r=1+.1*Math.sin(a*3+seed)*Math.sin(b*4)+.05*Math.cos(a*7+b*3);return [Math.sin(b)*Math.cos(a)*r*scale[0],Math.cos(b)*r*scale[1],Math.sin(b)*Math.sin(a)*r*scale[2]];});
}
export function arch(radius=4,thick=.55,depth=.7,start=0,end=Math.PI){
 // Four joined beveled bands around a segmented masonry arch.
 const vertices=[],uv=[],idx=[];const profile=[[radius,-depth],[radius+thick,-depth],[radius+thick,depth],[radius,depth],[radius,-depth]];
 for(let face=0;face<4;face++)for(let j=0;j<2;j++)for(let i=0;i<=32;i++){const a=start+(end-start)*i/32,[r,z]=profile[face+j];vertices.push(Math.cos(a)*r,Math.sin(a)*r,z);uv.push(i/8,j);}
 for(let f=0;f<4;f++)for(let i=0;i<32;i++){const a=f*66+i;idx.push(a,a+1,a+33,a+1,a+34,a+33);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export function leafSpray(seed,size=1){
 const p=[],uv=[],idx=[];
 for(let i=0;i<42;i++){const a=i*2.399+seed,r=Math.sqrt(i/42)*size;const x=Math.cos(a)*r,z=Math.sin(a)*r,y=Math.sin(i*3+seed)*size*.3;const l=size*(.26+.12*Math.sin(i));const base=p.length/3;const dx=Math.cos(a)*l,dz=Math.sin(a)*l;
 p.push(x,y,z,x+dx-dz*.4,y+.12,z+dz+dx*.4,x+dx*2,y+.03,z+dz*2,x+dx+dz*.4,y+.12,z+dz-dx*.4);uv.push(0,.5,.5,0,1,.5,.5,1);idx.push(base,base+1,base+2,base,base+2,base+3);}
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export const terrainHeight=(x,z)=>-.38+.3*Math.sin(x*.19)*Math.cos(z*.15)+1.8*Math.pow(Math.min(1,Math.hypot(x,z)/35),4);
