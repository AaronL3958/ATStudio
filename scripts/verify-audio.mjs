import assert from 'node:assert/strict';
import {analyze,spectrum,defaults} from '../app/visualizer.ts';
const rate=48000,length=rate/2;
function tone(hz){const channel=Float32Array.from({length},(_,i)=>hz?Math.sin(2*Math.PI*hz*i/rate)*.5:0);return {numberOfChannels:1,sampleRate:rate,duration:.5,length,getChannelData:()=>channel};}
const silence=await analyze(tone(0));assert(spectrum(silence,.25,defaults).every(x=>x===0));
const low=await analyze(tone(80)),high=await analyze(tone(6000));
const peak=arr=>arr.indexOf(Math.max(...arr));assert(peak(low.frames[15])<34);assert(peak(high.frames[15])>=68);
const off=spectrum(low,.25,{...defaults,bass:0});assert(off.slice(0,34).every(x=>x===0));
const highOff=spectrum(high,.25,{...defaults,treble:0});assert(highOff.slice(68).every(x=>x===0));
assert.deepEqual(spectrum(low,.25,defaults),spectrum(low,.25,defaults));
console.log('PASS: silence stays still, 80 Hz drives bass, 6 kHz drives treble, independent gains work, seeking uses deterministic analysis.');
