'use client';
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {Maximize2,PictureInPicture2,X} from 'lucide-react';
import {captureLivePreview,type LiveAudioConnection} from './live-preview-stream';
import {enterVideoFullscreen,toggleVideoPip,type PresentationVideo} from './video-presentation';
export type LivePreviewHandle={open:(mode:'fullscreen'|'pip')=>void;isSafariVideo:()=>boolean};
type Props={ready:boolean;playing:boolean;canvas:()=>HTMLCanvasElement|null;connectAudio:()=>LiveAudioConnection;onPlayback:(playing:boolean)=>void;onRender?:()=>void};
export default forwardRef<LivePreviewHandle,Props>(function LivePreviewVideo(props,ref){
 const video=useRef<PresentationVideo>(null),current=useRef(props),connection=useRef<LiveAudioConnection|null>(null),capture=useRef<ReturnType<typeof captureLivePreview>|null>(null),active=useRef(false),syncing=useRef(false);
 const [opened,setOpened]=useState(false),[loaded,setLoaded]=useState(false),[message,setMessage]=useState('');
 current.current=props;
 function close(){
  if(!active.current&&!opened)return;
  active.current=false;setOpened(false);setMessage('');
  const v=video.current;
  if(v){
   if(document.pictureInPictureElement===v)void document.exitPictureInPicture().catch(()=>{});
   else if(v.webkitPresentationMode==='picture-in-picture')v.webkitSetPresentationMode?.('inline');
   v.muted=true;void v.play().catch(()=>{});
  }
  connection.current?.setActive(false);current.current.onPlayback(false);
 }
 function setup(){
  const v=video.current,canvas=current.current.canvas();if(!v||!canvas)throw new Error('Wait for the preview to load.');
  if(capture.current)return;
  const audio=current.current.connectAudio();
  try{const source=captureLivePreview(canvas,audio.stream);connection.current=audio;capture.current=source;v.muted=true;v.srcObject=source.stream;void v.play().catch(()=>{})}catch(e){audio.dispose();throw e}
 }
 function open(mode:'fullscreen'|'pip'){
  setMessage('');
  try{
   setup();const v=video.current!;
   active.current=true;setOpened(true);connection.current!.setActive(true);v.muted=false;
   current.current.onPlayback(true);
   void v.play().catch(()=>{if(active.current)setMessage('Tap Play in the live player to start playback.');});
   if(v.readyState<1){setMessage('Connecting the live preview. When it appears, tap Fullscreen or Picture in Picture below.');return}
   // Safari requires this call inside the original tap, before any await.
   void (mode==='fullscreen'?enterVideoFullscreen(v,document):toggleVideoPip(v,document)).catch(()=>setMessage(mode==='fullscreen'?'This browser blocked live fullscreen. Try the video’s fullscreen control, or open ATStudio in Safari.':'Live Picture in Picture is unavailable here. You can still use live fullscreen.'));
  }catch(e){setMessage((e as Error).message);setOpened(true)}
 }
 useImperativeHandle(ref,()=>({open,isSafariVideo:()=>typeof video.current?.webkitEnterFullscreen==='function'}),[]);
 useEffect(()=>{
  if(!props.ready)return;
  // Warm the video before the tap so iPhone can enter fullscreen immediately.
  try{setup()}catch{/* Show an actionable message only when the player is requested. */}
  const v=video.current;if(!v)return;
  const ended=()=>{if(active.current&&v.webkitPresentationMode!=='picture-in-picture'&&document.pictureInPictureElement!==v)close()};
  const fullscreen=()=>{if(active.current&&document.fullscreenElement!==v&&v.webkitPresentationMode!=='picture-in-picture'&&document.pictureInPictureElement!==v)close()};
  v.addEventListener('webkitendfullscreen',ended);v.addEventListener('leavepictureinpicture',ended);document.addEventListener('fullscreenchange',fullscreen);
  return()=>{active.current=false;v.removeEventListener('webkitendfullscreen',ended);v.removeEventListener('leavepictureinpicture',ended);document.removeEventListener('fullscreenchange',fullscreen);v.pause();v.srcObject=null;capture.current?.dispose();capture.current=null;connection.current?.dispose();connection.current=null;setOpened(false);setLoaded(false)};
 },[props.ready]);
 useEffect(()=>{
  const v=video.current;if(!v||!active.current)return;
  syncing.current=true;
  if(props.playing)void v.play().catch(()=>{});else v.pause();
  // Media events are queued; handlers also compare the requested playback state.
  queueMicrotask(()=>{syncing.current=false});
 },[props.playing]);
 return <div className={'live-video-layer'+(opened?' live-video-open':'')}>
  <video ref={video} className="live-preview-video" aria-label="Live visualizer video" aria-hidden={!opened} tabIndex={opened?0:-1} controls={opened} playsInline autoPlay preload="auto" onLoadedMetadata={()=>{setLoaded(true);setMessage(old=>old.startsWith('Connecting')?'':old)}} onPlay={()=>{if(active.current&&!syncing.current&&!current.current.playing)current.current.onPlayback(true)}} onPause={()=>{if(active.current&&!syncing.current&&current.current.playing)current.current.onPlayback(false)}} onError={()=>{if(active.current)setMessage('This browser could not display the live stream. Return to the canvas, or try the rendered video fallback.')}}/>
  {opened&&<div className="live-video-controls"><div className="live-video-actions"><span>LIVE · NO RENDER</span><button className="preview-control" disabled={!loaded} onClick={()=>open('fullscreen')} aria-label="Fullscreen live video"><Maximize2 size={17}/></button><button className="preview-control" disabled={!loaded} onClick={()=>open('pip')} aria-label="Live Picture in Picture"><PictureInPicture2 size={17}/></button><button className="preview-control" onClick={close} aria-label="Return to live canvas"><X size={17}/></button></div>{message&&<p role="status">{message}</p>}<p>Use Studio’s timeline to seek. Live visuals may pause when the browser is in the background.{props.onRender&&<> <button className="live-render-fallback" onClick={()=>{close();props.onRender?.()}}>Rendered video fallback</button></>}</p></div>}
 </div>;
});
