import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
const bundle=await build({stdin:{contents:"export * from './app/piano-arrangement';export * from './app/harmony';export * from './app/score';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,external:['@tonejs/midi']});await fs.writeFile('.sites-runtime/arrangement-test.mjs',bundle.outputFiles[0].contents);const {arrangePiano,chordAccompaniment,withChordAccompaniment,estimateKey,decodeHarmony,musicXML}=await import('../.sites-runtime/arrangement-test.mjs');
const candidates=[];for(let i=0;i<8;i++){candidates.push({pitch:[67,69,71,72,71,69,67,64][i],start:i*.5,duration:.46,velocity:.8,hand:'right'});candidates.push({pitch:84,start:i*.5,duration:.12,velocity:.28,hand:'right'});candidates.push({pitch:48,start:i*.5,duration:.48,velocity:.75,hand:'left'});candidates.push({pitch:55,start:i*.5,duration:.46,velocity:.3,hand:'left'})}
const notes=arrangePiano(candidates,4,120,60);assert.deepEqual(notes.filter(n=>n.hand==='right').map(n=>n.pitch),[67,69,71,72,71,69,67,64]);assert(!notes.some(n=>n.hand==='left'),'Detected bass must not become left-hand accompaniment');
for(const hand of ['left','right']){const voice=notes.filter(n=>n.hand===hand);for(let i=1;i<voice.length;i++)assert(voice[i].start>=voice[i-1].start+voice[i-1].duration-.001,'Each hand must remain playable without overlapping voices')}
assert.deepEqual(arrangePiano([],5,120),[]);
const chart=['C','F','G','C'].map((name,i)=>({name,start:i*2,end:(i+1)*2,strength:.9}));assert.equal(estimateKey(chart).key,'C major');assert.equal(estimateKey([]).key,'Unknown');assert.equal(estimateKey(['C','Am','F','G'].map((name,i)=>({name,start:i*4,end:i*4+4,strength:.9}))).key,'C major');
const emissions=Array.from({length:160},(_,i)=>i<41?[-12,-.01,-8]:[-12,-8,-.01]);emissions[30]=[-12,-8,-.01];const chords=decodeHarmony(emissions,['N','C','G'],.05,8,.4,3);assert.deepEqual(chords.map(c=>c.name),['C','G']);assert(Math.abs(chords[1].start-2.05)<.001,'Smoothing must not delay a true chord change');
assert(musicXML({notes,bpm:120,offset:0,meter:4,duration:4,key:'F major'},'QA').includes('<fifths>-1</fifths>'));
const accompaniment=chordAccompaniment(chart,8,60,.15);
for(let i=0;i<chart.length;i++){const voice=accompaniment.filter(n=>Math.abs(n.start-(i*2+.15))<.001);assert.equal(voice.length,3);assert(voice.at(-1).pitch-voice[0].pitch<=12);assert.deepEqual(voice.map(n=>n.pitch%12).sort((a,b)=>a-b),({C:[0,4,7],F:[0,5,9],G:[2,7,11]})[chart[i].name]);}
assert.deepEqual(chordAccompaniment([{name:'N',start:0,end:2}],2),[]);
const arranged=withChordAccompaniment(notes,chart,8,60);assert.equal(arranged.filter(n=>n.hand==='right').length,8);assert(musicXML({notes:arranged,bpm:120,offset:0,meter:4,duration:8},'Chords').includes('<chord/>'));
const jingles=[64,64,64,64,64,64,64,67,60,62,64].map((pitch,i)=>({pitch,start:i*.5,duration:.4,velocity:.9,hand:'right'}));assert.deepEqual(arrangePiano(jingles,6,120,60).map(n=>n.pitch),jingles.map(n=>n.pitch),'Repeated melody notes must keep their rhythm');
console.log('PASS: melody over accompaniment, chord voicings, timing offsets, monophonic melody, repeated melody onsets, silence, tonal cadence, stable decoding without boundary delay, key-aware score.');
