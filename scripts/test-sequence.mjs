import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/sequence-animation.ts'],outfile:'.sites-runtime/test-sequence.js',bundle:true,platform:'node',format:'esm'});
const {sequenceAnimation,sequenceTiming,animationDefaults:d,animationStyles}=await import('../.sites-runtime/test-sequence.js');
for(const {id} of animationStyles){const s={...d,introStyle:id,outroStyle:id};assert.equal(sequenceAnimation(0,20,s).opacity,id==='none'?1:0);assert.equal(sequenceAnimation(20,20,s).opacity,id==='none'?1:0);assert.deepEqual(sequenceAnimation(10,20,s),{opacity:1,scale:1,y:0,rotation:0});for(const time of [-1,0,.5,1,2,18,19,20,25]){const a=sequenceAnimation(time,20,s);assert(a.opacity>=0&&a.opacity<=1);assert(a.scale>0&&a.scale<=1);assert(Object.values(a).every(Number.isFinite));}}
assert.deepEqual(sequenceAnimation(0,undefined,d),{opacity:1,scale:1,y:0,rotation:0},'Thumbnails stay visible');
assert.deepEqual(sequenceTiming({...d,introDuration:10,outroDuration:10},1),{intro:.5,outro:.5});
assert.equal(sequenceAnimation(.5,1,{...d,introDuration:10,outroDuration:10}).opacity,1,'Short tracks reach full visibility');
assert.equal(sequenceAnimation(0,20,{...d,introStyle:'none'}).opacity,1);
assert.equal(sequenceAnimation(20,20,{...d,outroStyle:'none'}).opacity,1);
assert.equal(sequenceAnimation(9,10,d).opacity,.5,'Test clip outro uses clip end');
assert.equal(sequenceAnimation(9,180,d).opacity,1,'Full song outro uses song end');
assert.equal(sequenceAnimation(1,20,d).scale,.775);
assert(sequenceAnimation(1,20,{...d,introStyle:'slide'}).y>0);
assert(sequenceAnimation(19,20,{...d,outroStyle:'slide'}).y<0);
for(let time=0;time<2;time+=.01)assert(sequenceAnimation(time,20,d).opacity<=sequenceAnimation(time+.01,20,d).opacity,'Intro opacity increases smoothly');
for(let time=18;time<20;time+=.01)assert(sequenceAnimation(time,20,d).opacity>=sequenceAnimation(time+.01,20,d).opacity,'Outro opacity decreases smoothly');
console.log('PASS: all animation endpoints, monotonic easing, independent None settings, short tracks, clip timing and thumbnail visibility.');
