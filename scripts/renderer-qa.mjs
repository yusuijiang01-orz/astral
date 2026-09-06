import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/renderer-qa'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
const page=await browser.newPage({viewport:{width:960,height:640},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
const results={status:'Renderer QA Failure',realDevice:'REAL_DEVICE_NOT_VERIFIED',errors};
function delta(a,b,center){let sum=0,n=0;for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){const d=Math.hypot(x-center.x,y-center.y);if(d<26||d>70)continue;const i=(y*a.width+x)*4;for(let c=0;c<3;c++){sum+=Math.abs(a.data[i+c]-b.data[i+c]);n++;}}return sum/n;}
try {
 await page.goto(process.env.QA_URL||'http://127.0.0.1:4173/?qa=1');
 await page.waitForFunction(()=>window.__ASTRAL_QA__?.ready,{},{timeout:90000});
 await page.evaluate(()=>window.__ASTRAL_QA__.freeze());
 const start=await page.evaluate(()=>window.__ASTRAL_QA__.step(0));
 const end=await page.evaluate(()=>window.__ASTRAL_QA__.step(.75));assert.notDeepEqual(start,end,'AnimationMixer must move a bone');
 await page.evaluate(()=>window.__ASTRAL_QA__.bloom(true));await page.screenshot({path:`${out}/selective-bloom-on.png`});
 results.stats=await page.evaluate(()=>window.__ASTRAL_QA__.stats());
 assert.match(results.stats.renderer,/SwiftShader/i);assert.equal(results.stats.glError,0);assert(results.stats.bones>=2);assert(results.stats.programs.some(p=>p.name==='AstralAnime:cloth'));assert(results.stats.programs.some(p=>p.name==='AstralEnvironmentPBR'));assert(results.stats.programs.length>5);assert(results.stats.programs.every(p=>p.runnable));assert(results.stats.triangles>0);
 await page.evaluate(()=>window.__ASTRAL_QA__.bloom(false));await page.screenshot({path:`${out}/selective-bloom-off.png`});
 const on=PNG.sync.read(await readFile(`${out}/selective-bloom-on.png`)),off=PNG.sync.read(await readFile(`${out}/selective-bloom-off.png`));
 results.bloom=results.stats.markerPixels.map(p=>delta(on,off,p));
 assert(results.bloom[0]>1,'selected marker halo must change');assert(results.bloom[0]>results.bloom[1]*3+.5,'unselected emissive marker must not bloom');
 await page.evaluate(()=>window.__ASTRAL_QA__.lighting(false));await page.screenshot({path:`${out}/lighting-off.png`});
 const dark=PNG.sync.read(await readFile(`${out}/lighting-off.png`));let lightDiff=0;for(let i=0;i<off.data.length;i+=4)lightDiff+=Math.abs(off.data[i]-dark.data[i]);results.lightingDelta=lightDiff/(off.width*off.height);assert(results.lightingDelta>2,'LightingRig must affect pixels');
 assert.deepEqual(errors,[]);results.status='PASS';
} catch(e){results.failure=e.stack;process.exitCode=1;} finally {await writeFile(`${out}/report.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();}
