import {pitches,qualities} from './music';
import {musicxCQT,type KernelGroup} from './musicx-cqt';
import {decodeHarmony,estimateKey} from './harmony';
async function modelFile(path:string){const url=path+'?v=481f4ce-browser1';let cache:Cache|undefined;try{cache=await caches.open('atstudio-musicx-v1');const saved=await cache.match(url);if(saved)return saved}catch{}const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error('Could not load the chord model. Check your connection and retry.');if(cache)try{await cache.put(url,response.clone())}catch{}return response}
export async function musicxChords(samples:Float32Array,bpm:number,minimumBeats:number,extensions:boolean,ensemble:boolean,progress:(p:number)=>void){
 const engine=ensemble?'MusicX · 5-model ensemble':'MusicX · single model';let peak=0;for(const s of samples)peak=Math.max(peak,Math.abs(s));if(peak<.0001){progress(1);return{chords:[{name:'N',start:0,end:samples.length/22050,strength:1}],key:'Unknown',keyAlternatives:[],chordEngine:engine}}
 const ort=await import('onnxruntime-web/wasm');ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths='/models/ort/';
 const response=await modelFile('/models/musicx/cqt-kernels.json');
 const groups=await response.json() as KernelGroup[],cqt=await musicxCQT(samples,groups,p=>progress(p*.15)),frames=cqt.length/252;
 const probabilities=new Float32Array(frames*90),folds=ensemble?5:1,chunk=768,context=128,total=folds*Math.ceil(frames/chunk);let finished=0;
 for(let fold=0;fold<folds;fold++){
  const session=await ort.InferenceSession.create(await(await modelFile('/models/musicx/fold-'+fold+'.onnx')).arrayBuffer(),{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  try{for(let start=0;start<frames;start+=chunk){const a=Math.max(0,start-context),b=Math.min(frames,start+chunk+context),input=new ort.Tensor('float32',cqt.slice(a*252,b*252),[1,b-a,252]);let output:Awaited<ReturnType<typeof session.run>>|undefined;
   try{output=await session.run({cqt:input});const logits=output.logits.data as Float32Array;for(let f=start;f<Math.min(frames,start+chunk);f++)for(const [begin,end] of [[0,73],[73,86],[86,90]]){const offset=(f-a)*100;let max=-Infinity,sum=0;for(let j=begin;j<end;j++)max=Math.max(max,logits[offset+j]);for(let j=begin;j<end;j++)sum+=Math.exp(logits[offset+j]-max);for(let j=begin;j<end;j++)probabilities[f*90+j]+=Math.exp(logits[offset+j]-max)/sum/folds}}finally{input.dispose();if(output)Object.values(output).forEach(t=>t.dispose())}
   progress(.15+.8*++finished/total);await new Promise(r=>setTimeout(r,0));
  }}finally{await session.release()}
 }
 const states=[{name:'N',triad:0,seventh:-1,root:-1}];for(let root=0;root<12;root++)for(const q of Object.keys(qualities)){if(!extensions&&!['','m'].includes(q))continue;const triad=q==='m'||q==='m7'?2:q==='sus4'?3:q==='sus2'?4:q==='dim'?5:q==='aug'?6:1;states.push({name:pitches[root]+q,root,triad:(triad-1)*12+root+1,seventh:q==='maj7'?1:q==='7'||q==='m7'?2:0})}
 const emissions:number[][]=[];for(let f=0;f<frames;f++){const off=f*90;let power=0;for(let j=-512;j<512;j++){const sample=samples[f*512+j]||0;power+=sample*sample}const silent=Math.sqrt(power/1024)<Math.max(.0001,peak*.002);emissions.push(states.map(s=>{if(silent)return s.root<0?0:-15;const log=(p:number)=>Math.log(Math.max(1e-8,p));let v=log(probabilities[off+s.triad]);if(s.root<0)return v+log(probabilities[off+73]);
  // Marginalize bass so inversions keep their harmonic chord instead of becoming a new root.
  if(extensions)v+=.65*log(probabilities[off+86+s.seventh]);return v;
 }))}
 const chords=decodeHarmony(emissions,states.map(s=>s.name),512/22050,samples.length/22050,Math.max(.18,60/bpm*minimumBeats),30);
 progress(1);return{chords,...estimateKey(chords),chordEngine:engine};
}
