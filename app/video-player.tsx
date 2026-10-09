'use client';
import {useEffect,useRef,useState} from 'react';
import {Maximize2,PictureInPicture2} from 'lucide-react';
import {canVideoFullscreen,canVideoPip,enterVideoFullscreen,toggleVideoPip,type PresentationVideo} from './video-presentation';
import './video-player.css';
export default function VideoPlayer({src,poster,title='ATStudio video',initialTime=0,volume=.8,onPosition,onPlay}:{src:string;poster?:string;title?:string;initialTime?:number;volume?:number;onPosition?:(time:number)=>void;onPlay?:()=>void}){
 const video=useRef<PresentationVideo>(null);
 const [ready,setReady]=useState(false),[pip,setPip]=useState(false),[capabilities,setCapabilities]=useState({fullscreen:false,pip:false}),[error,setError]=useState('');
 function refresh(){const v=video.current;if(v){setReady(v.readyState>=1);setCapabilities({fullscreen:canVideoFullscreen(v,document),pip:canVideoPip(v,document)});setPip(document.pictureInPictureElement===v||v.webkitPresentationMode==='picture-in-picture')}}
 useEffect(()=>{
  const v=video.current;if(!v)return;setError('');refresh();
  for(const event of ['enterpictureinpicture','leavepictureinpicture','webkitpresentationmodechanged','webkitbeginfullscreen','webkitendfullscreen'])v.addEventListener(event,refresh);
  return()=>{for(const event of ['enterpictureinpicture','leavepictureinpicture','webkitpresentationmodechanged','webkitbeginfullscreen','webkitendfullscreen'])v.removeEventListener(event,refresh);v.pause();if(document.pictureInPictureElement===v)void document.exitPictureInPicture().catch(()=>{});if(v.webkitPresentationMode==='picture-in-picture')v.webkitSetPresentationMode?.('inline')};
 },[src]);
 function present(kind:'fullscreen'|'pip'){
  const v=video.current;if(!v)return;setError('');
  const request=kind==='fullscreen'?enterVideoFullscreen(v,document):toggleVideoPip(v,document);
  void request.then(refresh).catch(e=>setError(kind==='pip'?'This browser blocked Picture in Picture. Try playing the video first, or open ATStudio directly in Safari or Chrome.':'This browser blocked fullscreen video. Try the video’s own fullscreen control, or open ATStudio directly in Safari or Chrome.'));
 }
 return <div className="native-video-player"><video ref={video} src={src} poster={poster} controls playsInline preload="metadata" aria-label={title} onLoadedMetadata={e=>{const v=e.currentTarget;v.volume=volume;if(initialTime>0&&Number.isFinite(v.duration))v.currentTime=Math.min(initialTime,Math.max(0,v.duration-.1));refresh()}} onCanPlay={refresh} onPlay={()=>{refresh();onPlay?.()}} onTimeUpdate={e=>onPosition?.(e.currentTarget.currentTime)} onError={()=>{setReady(false);setError('The video could not load. It may have been removed, or this browser may not support it.')}}/>
 <div className="native-video-actions"><button disabled={!ready||!capabilities.fullscreen} onClick={()=>present('fullscreen')}><Maximize2 size={17}/> Fullscreen</button><button disabled={!ready||!capabilities.pip} onClick={()=>present('pip')}><PictureInPicture2 size={17}/> {pip?'Exit Picture in Picture':'Picture in Picture'}</button></div>
 <p className="help native-video-hint">Use the video controls to play, seek, or change volume. Fullscreen uses your device’s video player.{ready&&(!capabilities.pip||!capabilities.fullscreen)&&' Some features are unavailable in this browser. Open in Safari or Chrome to try them.'}</p>
 {error&&<p className="error" role="alert">{error}</p>}</div>;
}
