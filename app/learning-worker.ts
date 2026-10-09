import {detectChords} from './chord-analysis';
import {musicxChords} from './musicx-chords';
import {arrangePiano} from './piano-arrangement';
import type {PianoNote} from './music';
export type AnalysisOptions={bpm?:number;minimumBeats:number;extensions:boolean;ensemble:boolean;threshold:number;split:number};
export type AnalysisRequest={kind:'chords'|'piano';samples:Float32Array;options:AnalysisOptions};
const scope=self as unknown as {onmessage:(e:MessageEvent<AnalysisRequest>)=>void;postMessage:(v:unknown)=>void};
scope.onmessage=async({data})=>{const {kind,samples,options}=data,signal=new AbortController().signal,progress=(value:number)=>scope.postMessage({progress:value});try{
 if(kind==='chords'){const half=new Float32Array(Math.floor(samples.length/2));for(let i=0;i<half.length;i++)half[i]=(samples[i*2]+samples[i*2+1])/2;const rhythm=await detectChords(half,signal,p=>progress(p*.15),options);const result=await musicxChords(samples,rhythm.bpm,options.minimumBeats,options.extensions,options.ensemble,p=>progress(.15+p*.85));scope.postMessage({result:{...result,bpm:rhythm.bpm,offset:rhythm.offset}})}
 else{const {transcribeSamples}=await import('./piano-analysis');const candidates=await transcribeSamples(samples,options.threshold,signal,p=>progress(p*.94));const notes:PianoNote[]=arrangePiano(candidates,samples.length/22050,options.bpm||120,options.split);progress(1);scope.postMessage({result:notes})}
 }catch(e){console.error('Learning analysis failed',e);scope.postMessage({error:(e as Error).message||'Analysis could not finish.'})}};
