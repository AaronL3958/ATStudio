import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/background-effects.ts','app/visualizer.ts','app/presets.ts','app/bass-effects.ts'],outdir:'.sites-runtime/background-tests',bundle:true,platform:'node',format:'esm'});
const {backgroundMotion,blurPixels}=await import('../.sites-runtime/background-tests/background-effects.js');
const {defaults,draw}=await import('../.sites-runtime/background-tests/visualizer.js');
const {makePreset,parsePreset}=await import('../.sites-runtime/background-tests/presets.js');
const {bassEffects}=await import('../.sites-runtime/background-tests/bass-effects.js');
const s={...defaults,backgroundShake:true,backgroundShakeAmount:50,backgroundShakeSpeed:24,backgroundShakeSensitivity:3,backgroundShakeZoom:12};
assert.deepEqual(backgroundMotion(1,{level:0,distance:0},s),{x:0,y:0,scale:1});
assert.deepEqual(backgroundMotion(1,{level:1,distance:0},{...s,backgroundShake:false}),{x:0,y:0,scale:1});
assert.deepEqual(backgroundMotion(1,{level:1,distance:0},{...s,backgroundShakeSensitivity:0}),{x:0,y:0,scale:1});
for(let t=0;t<10;t+=.017){const p=backgroundMotion(t,{level:1,distance:0},s);assert(Math.abs(p.x)<=50&&Math.abs(p.y)<=50&&p.scale<=1.12);const next=backgroundMotion(t+1e-7,{level:1,distance:0},s);assert(Math.hypot(next.x-p.x,next.y-p.y)<.01)}
const high={duration:2,rate:60,wave:[],frames:Array.from({length:120},()=>Float32Array.from({length:96},(_,b)=>b>30?1:0))};assert.equal(bassEffects(high,1,s).level,0);
const impulse={...high,frames:high.frames.map((_,i)=>Float32Array.from({length:96},(_,b)=>i<20&&b<25?1:0))};assert(bassEffects(impulse,.2,s).level>.8);assert(bassEffects(impulse,1.9,s).level<.01);
const uniform=new Uint8ClampedArray(31*17*4).fill(123);assert.deepEqual(blurPixels(uniform,31,17,20),uniform);assert.deepEqual(blurPixels(uniform,31,17,0),uniform);
assert.deepEqual(blurPixels(new Uint8ClampedArray([1,20,200,255]),1,1,80),new Uint8ClampedArray([1,20,200,255]));
const pixels=new Uint8ClampedArray(128*16*4);for(let i=0;i<128*16;i++){pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=i%128<64?0:255;pixels[i*4+3]=255}
const soft=blurPixels(pixels,128,16,8);assert(soft[60*4]>0&&soft[68*4]<255,'Blur must spread across an edge');assert.equal(soft[0],0);assert.equal(soft[127*4],255);assert(soft.every((v,i)=>i%4!==3||v===255),'Opaque edges must stay opaque');assert.equal(pixels[60*4],0,'Source pixels must not be changed');
const preset=parsePreset(JSON.parse(JSON.stringify(makePreset('Bass background',s))));for(const key of ['backgroundShake','backgroundShakeAmount','backgroundShakeSpeed','backgroundShakeSensitivity','backgroundShakeZoom'])assert.equal(preset.settings[key],s[key]);
assert.throws(()=>makePreset('Invalid',{...s,backgroundShakeSpeed:100}));assert.equal(makePreset('Legacy',{}).settings.backgroundShake,false);
// Compare all foreground draw coordinates with the background transform scoped away.
function trace(shake){let depth=0;const calls=[],gradient={addColorStop(){}};const ctx=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>gradient:(...args)=>{if(key==='save')depth++;if(['arc','fillText'].includes(key))calls.push([key,...args]);if(key==='restore')depth--;assert(depth>=0)},set:()=>true});draw({width:1920,height:1080,getContext:()=>ctx},{...s,backgroundShake:shake},.2,impulse);assert.equal(depth,0);return calls}
assert.deepEqual(trace(true),trace(false));
console.log('PASS: bounded continuous bass-only background motion, silence/release, foreground isolation, blur pixels/opacity, preset persistence and legacy defaults.');
