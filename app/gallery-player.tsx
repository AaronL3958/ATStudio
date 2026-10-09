'use client';
import {useEffect,useRef,useState} from 'react';
import {LoaderCircle,Pause,Play,Volume2} from 'lucide-react';
import {draw,type Analysis,type Artwork} from './visualizer';
import {unpackAnalysis,type GalleryPost} from './gallery-data';
import PreviewSurface from './preview-surface';
import VideoPreview from './video-preview';
import {exportVideo} from './export-video';
import {usePlaybackShortcut} from './use-playback-shortcut';
const time=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
export default function GalleryPlayer({post}:{post:GalleryPost}){
 const audio=useRef<HTMLAudioElement>(null),canvas=useRef<HTMLCanvasElement>(null),art=useRef<Artwork>({}),motion=useRef<Analysis|undefined>(undefined);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0),[volume,setVolume]=useState(.8),[retry,setRetry]=useState(0),[videoOpen,setVideoOpen]=useState(false);
 const url=(kind:string)=>`/api/gallery/${post.id}/media/${kind}?v=${post.revision}`;
 useEffect(()=>{
  let active=true,frame=0,face:FontFace|undefined;const abort=new AbortController();setReady(false);setError('');setPlaying(false);setPosition(0);audio.current?.load();art.current={};motion.current=undefined;
  async function read(kind:string){const r=await fetch(url(kind),{signal:abort.signal});if(!r.ok)throw new Error('This preview is unavailable or has changed. Reload the page to try again.');return r}
  (async()=>{try{
   const tasks:Promise<unknown>[]=[read('motion').then(r=>r.arrayBuffer()).then(b=>{if(active)motion.current=unpackAnalysis(new Uint8Array(b))})];
   for(const kind of ['background','center'] as const)if(post.media?.includes(kind))tasks.push((async()=>{const blob=await (await read(kind)).blob(),link=URL.createObjectURL(blob),image=new Image();try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Could not load the artwork.'));image.src=link});if(active)art.current[kind]=image}finally{URL.revokeObjectURL(link)}})());
   if(post.media?.includes('font'))tasks.push((async()=>{const buffer=await (await read('font')).arrayBuffer();face=new FontFace('ATStudio Gallery '+post.id,buffer);await face.load();if(active)document.fonts.add(face)})());
   await Promise.all(tasks);if(!active)return;setReady(true);
   const settings={...post.settings!,font:face?'ATStudio Gallery '+post.id:post.settings!.font};
   const render=()=>{if(canvas.current&&!document.hidden)draw(canvas.current,settings,audio.current?.currentTime||0,motion.current,art.current);frame=requestAnimationFrame(render)};render();
  }catch(e){if(active)setError((e as Error).message)}})();
  const player=audio.current;return()=>{active=false;abort.abort();cancelAnimationFrame(frame);player?.pause();if(face)document.fonts.delete(face)};
 },[post.id,post.revision,retry]);
 async function toggle(){if(!audio.current||!ready)return;try{if(audio.current.paused){if(audio.current.ended)audio.current.currentTime=0;await audio.current.play()}else audio.current.pause()}catch{setError('Playback could not start. Tap Play to try again.')}}
 usePlaybackShortcut(ready&&!videoOpen,toggle);
 async function prepareVideo(progress:(n:number)=>void,signal:AbortSignal){
  if(!motion.current)throw new Error('Wait for the visualizer to finish loading.');
  const response=await fetch(url('audio'),{signal});if(!response.ok)throw new Error('The song is no longer available. Reload the gallery post.');
  const context=new AudioContext();let buffer:AudioBuffer;try{buffer=await context.decodeAudioData(await response.arrayBuffer())}finally{await context.close()}
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  const settings={...post.settings!,resolution:720 as const,fps:30 as const,font:post.media?.includes('font')?'ATStudio Gallery '+post.id:post.settings!.font};
  return exportVideo(settings,buffer,motion.current,{...art.current},buffer.duration,progress,signal,true);
 }

 return <div className="gallery-player"><PreviewSurface playing={playing} ready={ready} onPlay={toggle} onVideo={()=>{audio.current?.pause();setVideoOpen(true)}}><canvas ref={canvas} width={1280} height={720} aria-label={post.title+' visualizer'}/></PreviewSurface>
 <audio ref={audio} src={url('audio')} preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onTimeUpdate={e=>setPosition(e.currentTarget.currentTime)} onLoadedMetadata={e=>{e.currentTarget.volume=volume}} onError={()=>setError('Audio is unavailable. The creator may have made this post private. Reload to check.')} />
 {!ready&&!error&&<p className="gallery-loading" role="status"><LoaderCircle className="spin" size={17}/> Loading visualizer…</p>}
 <div className="gallery-transport"><button className="primary" disabled={!ready} aria-label={playing?'Pause visualizer':'Play visualizer'} onClick={()=>void toggle()}>{playing?<Pause size={19}/>:<Play size={19}/>}</button><span>{time(position)} / {time(post.duration)}</span><label className="gallery-volume"><Volume2 size={18}/><input aria-label="Gallery playback volume" type="range" min={0} max={1} step={.01} value={volume} onChange={e=>{const v=+e.target.value;setVolume(v);if(audio.current)audio.current.volume=v}}/></label></div>
 <input className="gallery-seek" aria-label="Gallery playback position" type="range" min={0} max={post.duration} step={.1} value={position} disabled={!ready} onChange={e=>{if(audio.current){audio.current.currentTime=+e.target.value;setPosition(+e.target.value)}}}/>
 {videoOpen&&<VideoPreview title={post.title} initialTime={position} volume={volume} onPrepare={prepareVideo} onClose={t=>{if(audio.current)audio.current.currentTime=t;setPosition(t);setVideoOpen(false)}}/>}
 {error&&<div className="error" role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Retry preview</button></div>}</div>;
}
