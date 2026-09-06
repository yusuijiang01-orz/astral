"""Original authored stone/lichen PBR maps; CC0. Deterministic, no external art."""
import math,random,struct,zlib,pathlib
root=pathlib.Path(__file__).resolve().parents[1]/'public/assets/forest';n=128;random.seed(731)
h=[[.5+.13*math.sin(x*.2+math.sin(y*.11)*2)*math.sin(y*.18)+random.random()*.1 for x in range(n)] for y in range(n)]
def write(name,pixel):
 def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d))
 raw=b''.join(b'\0'+b''.join(bytes(max(0,min(255,int(c))) for c in pixel(x,y)) for x in range(n)) for y in range(n))
 (root/f'stone-{name}.png').write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',n,n,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
write('baseColor',lambda x,y:tuple(150+h[y][x]*v for v in (80,90,65)))
write('normal',lambda x,y:(128+(h[y][(x+1)%n]-h[y][(x-1)%n])*170,128+(h[(y+1)%n][x]-h[(y-1)%n][x])*170,250))
write('roughness',lambda x,y:(180+h[y][x]*60,)*3)
write('ao',lambda x,y:(195+h[y][x]*60,)*3)
