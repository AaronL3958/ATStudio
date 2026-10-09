import {monoAudio} from './chord-analysis';
import {learningWorkerVersion} from './learning-worker-version';
import type {AnalysisOptions} from './learning-worker';
export async function analyzeInWorker<T>(buffer:AudioBuffer,kind:'chords'|'piano',options:AnalysisOptions,signal:AbortSignal,progress:(p:number)=>void):Promise<T>{
 signal.throwIfAborted();const samples=await monoAudio(buffer,22050);signal.throwIfAborted();
 return new Promise((resolve,reject)=>{const worker=new Worker('/learning/analysis-worker.js?v='+learningWorkerVersion,{type:'module'});let settled=false;const finish=(error?:Error,result?:T)=>{if(settled)return;settled=true;worker.terminate();signal.removeEventListener('abort',abort);if(error)reject(error);else resolve(result!)};const abort=()=>finish(new DOMException('Analysis cancelled.','AbortError'));signal.addEventListener('abort',abort,{once:true});worker.onerror=()=>finish(new Error('The analysis worker could not start. Reload the page and try again.'));worker.onmessage=({data})=>{if(data.error)finish(new Error(data.error));else if('result' in data)finish(undefined,data.result);else if(typeof data.progress==='number')progress(data.progress)};worker.postMessage({kind,samples,options},[samples.buffer]);if(signal.aborted)abort()});
}
