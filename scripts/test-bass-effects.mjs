import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/bass-effects.ts'],outfile:'.sites-runtime/test-bass-effects.js',bundle:true,platform:'node',format:'esm'});
const {bassEffects,bassEffectDefaults:d,particleTravel,particlePosition,reactiveBlur}=await import('../.sites-runtime/test-bass-effects.js');
const s={...d,bassCeiling:180,blur:0};
const audio={duration:5,rate:60,wave:[],frames:Array.from({length:300},(_,i)=>Float32Array.from({length:96},(_,b)=>i>=60&&i<84&&b<26?.8:0))};
assert.equal(bassEffects(audio,.5,s).level,0,'Silence does not trigger effects');
const hit=bassEffects(audio,1.3,s),quiet=bassEffects(audio,4,s);assert(hit.level>.8);assert(quiet.level<.001,'Bass settles after a hit');
const distance=t=>particleTravel(t,bassEffects(audio,t,s),s),velocity=t=>(distance(t+.001)-distance(t))/.001;
assert(velocity(1.3)>velocity(.5)*3,'Particles accelerate on bass');assert(Math.abs(velocity(4)-s.particleSpeed)<.003,'Resting speed resumes');
for(let t=0;t<4.9;t+=.013){assert(distance(t+.01)>=distance(t));assert(Math.abs(distance(t+.000001)-distance(t))<.00001,'No position jumps at envelope boundaries');}
const atHit=distance(1.3);distance(4.9);assert.equal(distance(1.3),atHit,'Seeking backwards is deterministic');
assert(bassEffects(audio,2,{...s,effectRelease:1}).level>bassEffects(audio,2,{...s,effectRelease:.1}).level);
assert.equal(bassEffects(audio,1.3,{...s,effectSensitivity:0}).level,0);
assert(bassEffects(audio,1.3,{...s,effectThreshold:.8}).level<1e-6);
const highOnly={...audio,frames:audio.frames.map(()=>Float32Array.from({length:96},(_,b)=>b>30?1:0))};assert.equal(bassEffects(highOnly,2,s).level,0,'Mids and highs cannot trigger effects');
assert.equal(particleTravel(2,hit,{...s,particleBassSpeed:0}),2*s.particleSpeed);
assert.equal(reactiveBlur({...s,bassBlur:false,blur:4},1),4);assert.equal(reactiveBlur({...s,bassBlur:true,blur:4},0),4);assert.equal(reactiveBlur({...s,bassBlur:true,blur:4},1),22);assert.equal(reactiveBlur({...s,bassBlur:true,bassBlurSensitivity:0},1),0);
for(const direction of ['outward','inward','up']){const opts={...s,particleDirection:direction};for(let i=0;i<300;i++){const p=particlePosition(i,2,opts,1920,1080,960,500,200);assert(Object.values(p).every(Number.isFinite));assert(p.fade>=0&&p.fade<=1);}const p0=particlePosition(1,0,opts,1920,1080,960,500,200),p1=particlePosition(1,.01,opts,1920,1080,960,500,200);if(direction==='outward')assert(Math.hypot(p1.x-960,p1.y-500)>Math.hypot(p0.x-960,p0.y-500));if(direction==='inward')assert(Math.hypot(p1.x-960,p1.y-500)<Math.hypot(p0.x-960,p0.y-500));if(direction==='up')assert(p1.y<p0.y);}
console.log('PASS: bass-only effects, acceleration, release, continuous travel, seek determinism, shared detector settings, all three directions and bounded reactive blur.');
console.log(JSON.stringify({restingVelocity:velocity(.5),bassVelocity:velocity(1.3),settledVelocity:velocity(4)}));
