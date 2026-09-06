"""Original CC0 QA fixture, deliberately not a production character."""
import struct,json,math,zlib,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'public/assets/qa'
buf=bytearray(); views=[]; access=[]
def data(b):
 while len(buf)%4:buf.append(0)
 i=len(views);views.append({'buffer':0,'byteOffset':len(buf),'byteLength':len(b)});buf.extend(b);return i
def acc(values,ctype,typ,n,minimum=None,maximum=None):
 formats={5126:'f',5123:'H'};i=len(access);a={'bufferView':data(struct.pack('<'+formats[ctype]*len(values),*values)),'componentType':ctype,'count':n,'type':typ}
 if minimum is not None:a.update(min=minimum,max=maximum)
 access.append(a);return i
pos=[];norm=[];uv=[];joints=[];weights=[];idx=[]
for y in range(9):
 for s in range(17):
  a=s/16*math.tau;r=.48*(1-.25*math.cos(y/8*math.pi*2));pos.extend([r*math.cos(a),y/4,r*math.sin(a)]);norm.extend([math.cos(a),0,math.sin(a)]);uv.extend([s/16,y/8]);joints.extend([0,1,0,0]);w=max(0,(y/8-.3)/.7);weights.extend([1-w,w,0,0])
for y in range(8):
 for s in range(16):
  a=y*17+s;idx.extend([a,a+17,a+1,a+1,a+17,a+18])
attrs={'POSITION':acc(pos,5126,'VEC3',153,[-.7,0,-.7],[.7,2,.7]),'NORMAL':acc(norm,5126,'VEC3',153),'TEXCOORD_0':acc(uv,5126,'VEC2',153),'JOINTS_0':acc(joints,5123,'VEC4',153),'WEIGHTS_0':acc(weights,5126,'VEC4',153)}
indices=acc(idx,5123,'SCALAR',len(idx));mat=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];ibm=acc(mat+mat,5126,'MAT4',2)
times=acc([0,1,2],5126,'SCALAR',3,[0],[2]);rot=acc([0,0,0,1,0,0,math.sin(.3),math.cos(.3),0,0,0,1],5126,'VEC4',3)
def png(rgb):
 def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
 rows=b''.join(b'\0'+bytes(rgb(x,y)) for y in range(8) for x in []) if False else b''.join(b'\0'+b''.join(bytes(rgb(x,y)) for x in range(8)) for y in range(8))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',8,8,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(rows))+chunk(b'IEND',b'')
images=[{'bufferView':data(png(fn)),'mimeType':'image/png'} for fn in [lambda x,y:(80+20*((x+y)%2),160,185),lambda x,y:(128,128,255),lambda x,y:(230,195,0)]]
g={'asset':{'version':'2.0','generator':'Astral original CC0 QA fixture'},'scene':0,'scenes':[{'nodes':[0,3]}],'nodes':[{'name':'QA_Root','children':[1]},{'name':'QA_Bone','children':[2]},{'name':'QA_Tip'},{'name':'QA_Skinned','mesh':0,'skin':0}],'skins':[{'joints':[1,2],'inverseBindMatrices':ibm,'skeleton':1}],'meshes':[{'primitives':[{'attributes':attrs,'indices':indices,'material':0}]}],'materials':[{'name':'QA_Cloth','extras':{'astralType':'cloth'},'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicRoughnessTexture':{'index':2},'metallicFactor':0},'normalTexture':{'index':1},'occlusionTexture':{'index':2},'doubleSided':True}],'textures':[{'source':i} for i in range(3)],'images':images,'animations':[{'name':'Idle','samplers':[{'input':times,'output':rot,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':2,'path':'rotation'}}]}],'bufferViews':views,'accessors':access,'buffers':[{'byteLength':len(buf)}]}
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);buf+=b'\0'*((-len(buf))%4)
(root/'skinned-fixture.glb').write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(buf))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(buf),0x004e4942)+buf)
