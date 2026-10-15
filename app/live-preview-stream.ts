export type LiveAudioConnection={stream:MediaStream;setActive:(active:boolean)=>void;dispose:()=>void};
/** Tap the existing mix. Only one audible output is active at a time. */
export function connectPreviewAudio(context:AudioContext,mix:GainNode):LiveAudioConnection{
 const destination=context.createMediaStreamDestination();mix.connect(destination);
 let active=false,disposed=false;
 function setActive(next:boolean){
  if(disposed||next===active)return;
  if(next)mix.disconnect(context.destination);else mix.connect(context.destination);
  active=next;
 }
 return {stream:destination.stream,setActive,dispose(){if(disposed)return;setActive(false);disposed=true;try{mix.disconnect(destination)}catch{}destination.stream.getTracks().forEach(track=>track.stop())}};
}
export function captureLivePreview(canvas:HTMLCanvasElement,audio:MediaStream){
 if(typeof canvas.captureStream!=='function')throw new Error('Live video capture is unavailable in this browser.');
 const capture=canvas.captureStream(30);
 if(!capture.getVideoTracks().length){capture.getTracks().forEach(t=>t.stop());throw new Error('This browser could not capture the live preview.')}
 return {stream:new MediaStream([...capture.getVideoTracks(),...audio.getAudioTracks()]),dispose(){capture.getTracks().forEach(track=>track.stop())}};
}
