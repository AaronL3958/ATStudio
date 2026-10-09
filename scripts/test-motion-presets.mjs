import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/circle-motion.ts','app/presets.ts','app/visualizer.ts'],outdir:'.sites-runtime/motion-tests',bundle:true,platform:'node',format:'esm'});
const {circleMotion,circleMotionDefaults:d}=await import('../.sites-runtime/motion-tests/circle-motion.js');
const {defaults,draw}=await import('../.sites-runtime/motion-tests/visualizer.js');
const {makePreset,parsePreset,applyLook}=await import('../.sites-runtime/motion-tests/presets.js');
for(const circlePath of ['float','orbit','sway']){
 const s={...d,circleShake:40,circleDrift:100,circleTilt:12,circlePath};
 assert(Object.values(circleMotion(2,{level:0,distance:1},s)).every(v=>v===0));
 for(let t=0;t<10;t+=.017){const p=circleMotion(t,{level:1,distance:t},s);assert(Object.values(p).every(Number.isFinite));assert(Math.abs(p.x)<=140&&Math.abs(p.y)<=140&&Math.abs(p.rotation)<=12*Math.PI/180);const next=circleMotion(t+.000001,{level:1,distance:t},s);assert(Math.hypot(p.x-next.x,p.y-next.y)<.01,'Motion must be continuous');}
 assert(Object.values(circleMotion(2,{level:1,distance:1},{...s,circleSensitivity:0})).every(v=>v===0));
 assert.deepEqual(circleMotion(3,{level:.5,distance:1},s),circleMotion(3,{level:.5,distance:1},s));
}
const look=makePreset('My bass look',{...defaults,color:'#aabbcc',circleShake:12,circleDrift:24,circlePath:'orbit',text:'OLD SONG',sourceUrl:'https://youtu.be/ZhZPxRBP498',centerZoom:3});
const round=JSON.parse(JSON.stringify(look));assert.deepEqual(parsePreset(round),look);
const current={...defaults,text:'NEW SONG',subtitle:'New artist',sourceUrl:'https://youtu.be/ZhZPxRBP498',resolution:1440,centerZoom:1.5};
const applied=applyLook(current,look);assert.equal(applied.color,'#aabbcc');assert.equal(applied.circleShake,12);assert.equal(applied.circlePath,'orbit');for(const key of ['text','subtitle','sourceUrl','resolution','centerZoom'])assert.equal(applied[key],current[key]);
assert.equal(applyLook({...current,font:'ATStudio Custom'},makePreset('Custom font',{...defaults,font:'ATStudio Custom'})).font,'ATStudio Custom');
for(const settings of [{circleShake:51},{circleSpeed:0},{circlePath:'evil'},{color:'url(javascript:bad)'},{circleDrift:Infinity}])assert.throws(()=>makePreset('Bad',settings));
for(const x of [null,[],{version:2},{...look,version:2},{...look,name:''},{...look,settings:[]}])assert.throws(()=>parsePreset(x));
assert(!Object.hasOwn(look.settings,'sourceUrl'));assert(!Object.hasOwn(look.settings,'text'));
// Canvas transform calls must agree when rendering the same time after seeking.
let trace=[];const gradient={addColorStop(){}};const context=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'||key==='createRadialGradient'?()=>gradient:(...args)=>{if(['translate','rotate','scale'].includes(key))trace.push([key,...args])},set:()=>true});
const canvas={width:1920,height:1080,getContext:()=>context},audio={duration:4,rate:60,wave:[],frames:Array.from({length:240},()=>new Float32Array(96).fill(.7))};
draw(canvas,{...applied,introStyle:'none'},1.3,audio);const first=structuredClone(trace);trace=[];draw(canvas,applied,3,audio);trace=[];draw(canvas,{...applied,introStyle:'none'},1.3,audio);assert.deepEqual(trace,first);
console.log('PASS: bass-gated continuous bounded circle motion, deterministic canvas transforms, preset round-trip, project preservation, custom font preservation and invalid preset rejection.');
