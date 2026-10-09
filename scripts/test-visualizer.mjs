import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/visualizer.ts','app/image-crop.ts'],outdir:'.sites-runtime/visualizer-tests',bundle:true,platform:'node',format:'esm'});
const {analyze,spectrum,defaults,draw,spectrumStyles}=await import('../.sites-runtime/visualizer-tests/visualizer.js');
const {cropRect}=await import('../.sites-runtime/visualizer-tests/image-crop.js');
function tone(hz,phaseStereo=false){const sampleRate=48000,length=sampleRate,channel=Float32Array.from({length},(_,i)=>Math.sin(2*Math.PI*hz*i/sampleRate)*.7);return{sampleRate,length,duration:1,numberOfChannels:phaseStereo?2:1,getChannelData:i=>i?channel.map(x=>-x):channel};}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const low=await analyze(tone(65)),mid=await analyze(tone(1000)),high=await analyze(tone(8000)),inverted=await analyze(tone(65,true));
assert(mean(spectrum(low,.5,defaults))>.3,'Bass must drive visible motion');
assert(mean(spectrum(mid,.5,defaults))<.001,'Mids must not drive the spectrum');
assert(mean(spectrum(high,.5,defaults))<.001,'Treble must not drive the spectrum');
assert(Math.abs(mean(spectrum(low,.5,defaults))-mean(spectrum(inverted,.5,defaults)))<1e-6,'Stereo phase cancellation must not hide bass');
const values=Array.from({length:60},(_,i)=>Float32Array.from({length:96},(_,b)=>b<26?(i%2):1));
const a={frames:values,rate:60,duration:1,wave:[]};
assert.deepEqual(spectrum(a,.2,{...defaults,mids:0,treble:0}),spectrum(a,.2,{...defaults,mids:3,treble:3}));
const before=mean(spectrum(a,.5-1e-6,defaults)),after=mean(spectrum(a,.5+1e-6,defaults));assert(Math.abs(before-after)<.001,'Interpolation must cross frame boundaries without jumps');
assert(mean(spectrum(low,.5,{...defaults,bass:0}))===0);
for(const [iw,ih] of [[4000,1000],[1000,4000],[1000,1000]])for(const aspect of [1,16/9])for(const zoom of [1,2,5])for(const x of [0,50,100])for(const y of [0,50,100]){const r=cropRect(iw,ih,aspect,{zoom,x,y});assert(r.sx>=0&&r.sy>=0&&r.sx+r.sw<=iw+.00001&&r.sy+r.sh<=ih+.00001);assert(Math.abs(r.sw/r.sh-aspect)<1e-8);}
const calls=[];const gradient={addColorStop(){}};const ctx=new Proxy({},{get(_,key){if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;return(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),String(key));calls.push([key,...args]);};},set(){return true}});
for(const style of spectrumStyles){calls.length=0;const settings={...defaults,style:style.id,backgroundZoom:2,backgroundX:20,centerZoom:3,centerY:85};const art={background:{width:1500,height:1000},center:{width:1500,height:1000}};const canvas={width:1280,height:720,getContext:()=>ctx};draw(canvas,settings,.5,low,art);const first=JSON.stringify(calls);calls.length=0;draw(canvas,settings,.5,low,art);assert.equal(JSON.stringify(calls),first,'Preview/export rendering must be deterministic');if(style.id!=='bars')assert(calls.some(c=>c[0]==='quadraticCurveTo'));}
// Legacy project settings must render with safe crop/style defaults.
const legacy={...defaults};for(const k of ['backgroundZoom','backgroundX','backgroundY','centerZoom','centerX','centerY','roundness','fill','bassCeiling'])delete legacy[k];draw({width:2560,height:1440,getContext:()=>ctx},legacy,.5,low,{center:{width:1000,height:400}});
console.log('PASS: bass isolation, stereo phase, continuous motion, zero gain, bounded crops, six curved styles, deterministic export and legacy settings.');
console.log(JSON.stringify({bass:mean(spectrum(low,.5,defaults)),mid:mean(spectrum(mid,.5,defaults)),treble:mean(spectrum(high,.5,defaults))}));
