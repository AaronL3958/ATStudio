'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Maximize2,Pause,Play,PictureInPicture2,X} from 'lucide-react';
import {tryPreviewFullscreen} from './preview-fullscreen';
import './preview-surface.css';

export default function PreviewSurface({children,playing,ready,onPlay,onVideo}:{children:ReactNode;playing:boolean;ready:boolean;onPlay:()=>Promise<void>;onVideo?:()=>void}) {
  const [mode,setMode]=useState<'native'|'fallback'|null>(null);
  const root=useRef<HTMLDivElement>(null), launch=useRef<HTMLButtonElement>(null), done=useRef<HTMLButtonElement>(null);
  const mounted=useRef(false),pending=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
  useEffect(()=>{
    const changed=()=>setMode(previous=>document.fullscreenElement===root.current?'native':previous==='native'?null:previous);
    document.addEventListener('fullscreenchange',changed);
    return()=>document.removeEventListener('fullscreenchange',changed);
  },[]);
  async function expand(){
    if(pending.current||!root.current)return;
    pending.current=true;
    const native=await tryPreviewFullscreen(root.current,document);
    if(mounted.current){if(!native&&onVideo)onVideo();else setMode(native?'native':'fallback')}
    pending.current=false;
  }
  async function close(){
    if(document.fullscreenElement===root.current){
      try{await document.exitFullscreen()}catch{return}
    }
    setMode(null);
  }
  useEffect(()=>{
    if(!mode)return;
    done.current?.focus({preventScroll:true});
    return()=>{requestAnimationFrame(()=>{if(mounted.current)launch.current?.focus({preventScroll:true})})};
  },[mode]);
  useEffect(()=>{
    if(mode!=='fallback'||!root.current)return;
    const panel=root.current,body=document.body,scrollX=window.scrollX,scrollY=window.scrollY;
    const properties=['position','top','left','width','overflow'] as const;
    const previous=properties.map(key=>[key,body.style[key]] as const);
    Object.assign(body.style,{position:'fixed',top:`-${scrollY}px`,left:`-${scrollX}px`,width:'100%',overflow:'hidden'});
    const siblings=Array.from(body.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&node!==panel);
    const inert=siblings.map(node=>[node,node.inert] as const);
    siblings.forEach(node=>{node.inert=true});
    const viewport=window.visualViewport;
    const resize=()=>{
      panel.style.setProperty('--preview-width',`${viewport?.width??window.innerWidth}px`);
      panel.style.setProperty('--preview-height',`${viewport?.height??window.innerHeight}px`);
      panel.style.setProperty('--preview-top',`${viewport?.offsetTop??0}px`);
      panel.style.setProperty('--preview-left',`${viewport?.offsetLeft??0}px`);
    };
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setMode(null)}
      if(event.key==='Tab'){
        const buttons=Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
    };
    resize();
    viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize);
    window.addEventListener('resize',resize);document.addEventListener('keydown',keydown);
    return()=>{
      viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);
      window.removeEventListener('resize',resize);document.removeEventListener('keydown',keydown);
      inert.forEach(([node,value])=>{node.inert=value});
      previous.forEach(([key,value])=>{body.style[key]=value});
      window.scrollTo({left:scrollX,top:scrollY,behavior:'instant'});
    };
  },[mode]);
  const panel=<div ref={root} className={`canvas-wrap preview-surface${mode?' preview-expanded':''}${mode==='fallback'?' preview-fallback':''}`} data-preview-mode={mode??'inline'} role={mode==='fallback'?'dialog':undefined} aria-modal={mode==='fallback'?true:undefined} aria-label={mode?'Expanded visualizer preview':undefined}>
    {children}
    {mode?<div className="preview-toolbar"><button className="preview-control" disabled={!ready} onClick={()=>void onPlay()} aria-label={playing?'Pause preview':'Play preview'}>{playing?<Pause size={19}/>:<Play size={19}/>}<span>{playing?'Pause':'Play'}</span></button><button ref={done} className="preview-control" onClick={()=>void close()} aria-label="Close fullscreen preview"><X size={19}/><span>Done</span></button></div>:<>{onVideo&&<button className="preview-control preview-video" disabled={!ready} onClick={onVideo} aria-label="Video player and Picture in Picture" title="Native video player & Picture in Picture"><PictureInPicture2 size={19}/></button>}<button ref={launch} disabled={!ready} className="preview-control preview-expand" aria-label="Fullscreen preview" title="Expand preview" onClick={()=>void expand()}><Maximize2 size={19}/></button></>}
  </div>;
  // The renderer reads the live canvas ref each frame; audio and playback stay in Studio.
  return mode==='fallback'?createPortal(panel,document.body):panel;
}
