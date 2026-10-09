import type {PianoNote} from './music';
// Runs only in the disposable learning worker. WASM avoids occupying Studio's GPU.
export async function transcribeSamples(samples:Float32Array,threshold:number,signal:AbortSignal,progress:(p:number)=>void):Promise<PianoNote[]>{
 const [tf,wasm,{outputToNotesPoly}]=await Promise.all([import('@tensorflow/tfjs'),import('@tensorflow/tfjs-backend-wasm'),import('@spotify/basic-pitch')]);
 wasm.setWasmPaths('/models/tf-wasm/');wasm.setThreadsCount(1);await tf.setBackend('wasm');await tf.ready();signal.throwIfAborted();
 const model=await tf.loadGraphModel('/models/basic-pitch/model.json');
 try{const windowSize=43844,hop=36164,frames:number[][]=[],onsets:number[][]=[];let rowsPerWindow=142;
  for(let off=0;off<samples.length;off+=hop){signal.throwIfAborted();const chunk=new Float32Array(windowSize);for(let i=0;i<windowSize;i++)chunk[i]=samples[off+i-3840]||0;
   const outputs=tf.tidy(()=>{const input=tf.tensor3d(chunk,[1,windowSize,1]),result=model.execute(input,['Identity_1','Identity_2']) as import('@tensorflow/tfjs').Tensor3D[];return result.map(t=>t.slice([0,15,0],[1,t.shape[1]-30,88]).reshape([t.shape[1]-30,88]))});
   try{const values=await Promise.all(outputs.map(t=>t.array() as Promise<number[][]>));rowsPerWindow=values[0].length;frames.push(...values[0]);onsets.push(...values[1])}finally{outputs.forEach(t=>t.dispose())}
   progress(.05+.9*Math.min(1,(off+hop)/samples.length));await new Promise(r=>setTimeout(r,0));
  }
  const notes=outputToNotesPoly(frames,onsets,threshold,Math.max(.12,threshold-.15),5,true,null,null,false),secondsPerFrame=hop/22050/rowsPerWindow,duration=samples.length/22050;
  const result=notes.map(n=>{const start=Math.max(0,n.startFrame*secondsPerFrame);return{pitch:n.pitchMidi,start,duration:Math.min(n.durationFrames*secondsPerFrame,duration-start),velocity:Math.max(.05,Math.min(1,n.amplitude)),hand:'right'} as PianoNote}).filter(n=>n.duration>.08&&n.start<duration).sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
  signal.throwIfAborted();progress(1);return result;
 }finally{model.dispose()}
}
