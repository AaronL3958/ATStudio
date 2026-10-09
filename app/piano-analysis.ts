import {monoAudio} from './chord-analysis';
import type {PianoNote} from './music';
let cachedModel:Promise<import('@tensorflow/tfjs').GraphModel>|null=null;
let running=false;
export async function transcribePiano(buffer:AudioBuffer,split:number,threshold:number,signal:AbortSignal,progress:(p:number)=>void):Promise<PianoNote[]>{
 if(running)throw new Error('A previous transcription is finishing. Please try again in a moment.');running=true;try{return await infer(buffer,split,threshold,signal,progress)}finally{running=false}
}
async function infer(buffer:AudioBuffer,split:number,threshold:number,signal:AbortSignal,progress:(p:number)=>void,cpu=false):Promise<PianoNote[]>{
 const [tf,{outputToNotesPoly}]=await Promise.all([import('@tensorflow/tfjs'),import('@spotify/basic-pitch')]);
 signal.throwIfAborted();await tf.ready();if(cpu)await tf.setBackend('cpu');cachedModel??=tf.loadGraphModel('/models/basic-pitch/model.json').catch(e=>{cachedModel=null;throw e});const model=await cachedModel;
 try{
  const samples=await monoAudio(buffer,22050),windowSize=43844,hop=36164,frames:number[][]=[],onsets:number[][]=[];let rowsPerWindow=142;
  for(let off=0;off<samples.length;off+=hop){signal.throwIfAborted();const chunk=new Float32Array(windowSize);for(let i=0;i<windowSize;i++)chunk[i]=samples[off+i-3840]||0;
   const outputs=tf.tidy(()=>{const input=tf.tensor3d(chunk,[1,windowSize,1]),result=model.execute(input,['Identity_1','Identity_2']) as import('@tensorflow/tfjs').Tensor3D[];return result.map(t=>t.slice([0,15,0],[1,t.shape[1]-30,88]).reshape([t.shape[1]-30,88]))});
   try{const values=await Promise.all(outputs.map(t=>t.array() as Promise<number[][]>));if(off===0&&!cpu&&tf.getBackend()!=='cpu'&&chunk.some(v=>Math.abs(v)>.001)&&values[0].every(row=>row.every(v=>v===0||!Number.isFinite(v)))){model.dispose();cachedModel=null;return await infer(buffer,split,threshold,signal,progress,true)}rowsPerWindow=values[0].length;frames.push(...values[0]);onsets.push(...values[1])}finally{outputs.forEach(t=>t.dispose())}
   progress(.05+.85*Math.min(1,(off+hop)/samples.length));await new Promise(r=>setTimeout(r,0));
  }
  signal.throwIfAborted();const notes=outputToNotesPoly(frames,onsets,threshold,Math.max(.15,threshold-.1),8,true,null,null,false);
  // Each cropped model window spans one hop. Preserve that clock to avoid accumulating drift.
  const secondsPerFrame=hop/22050/rowsPerWindow;
  const result=notes.map(n=>{const start=Math.max(0,n.startFrame*secondsPerFrame);return{pitch:n.pitchMidi,start,duration:Math.min(n.durationFrames*secondsPerFrame,buffer.duration-start),velocity:Math.max(.05,Math.min(1,n.amplitude)),hand:n.pitchMidi<split?'left':'right'} as PianoNote}).filter(n=>n.duration>.06&&n.start<buffer.duration).sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
  signal.throwIfAborted();progress(1);return result;
 }catch(e){if((e as Error).name!=='AbortError'){model.dispose();cachedModel=null}throw e}
}
