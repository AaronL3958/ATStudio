'use client';
import {useEffect,useRef,useState} from 'react';
import {Move,RotateCcw,X} from 'lucide-react';
import {cover,cropRect,defaultCrop,type Crop} from './image-crop';

export default function CropEditor({kind,image,initial,onApply,onClose}:{kind:'background'|'center';image:HTMLImageElement;initial:Crop;onApply:(value:Crop)=>void;onClose:()=>void}){
 const [crop,setCrop]=useState(initial),dialog=useRef<HTMLDialogElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const drag=useRef<{pointer:number;x:number;y:number;crop:Crop}|null>(null),round=kind==='center',aspect=round?1:16/9;
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close()},[]);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const c=el.getContext('2d')!;
  c.clearRect(0,0,el.width,el.height);cover(c,image,0,0,el.width,el.height,crop);
  if(round){c.save();c.fillStyle='#100d0bd9';c.beginPath();c.rect(0,0,el.width,el.height);c.arc(el.width/2,el.height/2,el.width/2-1,0,Math.PI*2,true);c.fill('evenodd');c.restore();}
  c.strokeStyle='#ffffff45';c.lineWidth=1;c.beginPath();for(const fraction of [1/3,2/3]){c.moveTo(el.width*fraction,0);c.lineTo(el.width*fraction,el.height);c.moveTo(0,el.height*fraction);c.lineTo(el.width,el.height*fraction);}c.stroke();
 },[crop,image,round]);
 return <dialog ref={dialog} className="modal crop-modal" onCancel={e=>{e.preventDefault();onClose()}}>
  <div className="modal-heading"><div><div className="eyebrow">FRAME YOUR ARTWORK</div><h2>Crop {round?'center artwork':'background'}</h2></div><button aria-label="Close crop editor" onClick={onClose}><X size={20}/></button></div>
  <div className={'crop-stage '+(round?'crop-round':'')}><canvas ref={canvas} width={round?480:800} height={round?480:450} aria-label="Crop preview. Drag to reposition the image, or use the position sliders below."
   onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,crop:{...crop}}}}
   onPointerMove={e=>{const start=drag.current;if(!start||start.pointer!==e.pointerId)return;const rect=e.currentTarget.getBoundingClientRect(),source=cropRect(image.naturalWidth,image.naturalHeight,aspect,start.crop),travelX=image.naturalWidth-source.sw,travelY=image.naturalHeight-source.sh;setCrop({...start.crop,x:Math.max(0,Math.min(100,start.crop.x-(travelX?(e.clientX-start.x)/rect.width*source.sw/travelX*100:0))),y:Math.max(0,Math.min(100,start.crop.y-(travelY?(e.clientY-start.y)/rect.height*source.sh/travelY*100:0)))})}}
   onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}/></div>
  <p className="crop-hint"><Move size={15}/> Drag to frame your image. Zoom in for more room to move.</p>
  {([['zoom','Zoom',1,5,.01],['x','Horizontal position',0,100,1],['y','Vertical position',0,100,1]] as const).map(([key,label,min,max,step])=><label className="slider-label" key={key}><span>{label}<b>{crop[key].toFixed(key==='zoom'?2:0)}{key==='zoom'?'×':'%'}</b></span><input aria-label={'Crop '+label.toLowerCase()} type="range" min={min} max={max} step={step} value={crop[key]} onChange={e=>setCrop(old=>({...old,[key]:+e.target.value}))}/></label>)}
  <p className="help">Your original image stays intact. This framing is used in the live preview and exported video.</p>
  <div className="modal-actions"><button onClick={()=>setCrop({...defaultCrop})}><RotateCcw size={15}/> Reset</button><button onClick={onClose}>Cancel</button><button className="primary" onClick={()=>onApply(crop)}>Apply crop</button></div>
 </dialog>;
}
