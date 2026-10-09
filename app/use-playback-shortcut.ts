'use client';
import {useEffect,useRef} from 'react';

/** Keep transport shortcuts out of text editing, native controls, and dialogs. */
export function usePlaybackShortcut(enabled:boolean,toggle:()=>void|Promise<void>){
 const current=useRef({enabled,toggle});
 useEffect(()=>{current.current={enabled,toggle}});
 useEffect(()=>{
  let pending=false;
  const onKeyDown=(event:KeyboardEvent)=>{
   if(event.code!=='Space'||event.repeat||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||!current.current.enabled)return;
   const target=event.target;
   if(target instanceof Element&&target.closest('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"]'))return;
   if(document.querySelector('dialog[open],.account-dropdown'))return;
   event.preventDefault();
   if(pending)return;
   pending=true;
   Promise.resolve().then(()=>current.current.toggle()).finally(()=>{pending=false});
  };
  window.addEventListener('keydown',onKeyDown);
  return()=>window.removeEventListener('keydown',onKeyDown);
 },[]);
}
