'use client';
import {useEffect,useRef} from 'react';
import {Check,FolderOpen} from 'lucide-react';
import {defaults,draw,spectrumStyles,type Analysis} from './visualizer';
import {applyFactoryPreset,factoryPresets,type FactoryPreset} from './factory-presets';

// A shared illustrative sample, drawn once per card. No extra audio analysis or
// animation loops run alongside the main live preview.
const sample:Analysis={duration:8,rate:30,wave:[],frames:Array.from({length:240},(_,f)=>Float32Array.from({length:96},(_,b)=>.16+(.2+.08*Math.sin(b*.32))*Math.exp(-((f/30*2)%1)*3)))};
function Preview({preset}:{preset:FactoryPreset}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(canvas.current)draw(canvas.current,{...applyFactoryPreset(defaults,preset),text:'',subtitle:''},3.05,sample)},[preset]);
 return <canvas ref={canvas} width={480} height={270} aria-hidden="true"/>;
}

export default function FactoryPresetGallery({selected,disabled,onApply,onLibrary}:{selected:string;disabled:boolean;onApply:(preset:FactoryPreset)=>void;onLibrary:()=>void}){
 return <section className="factory-presets" aria-label="Visualizer presets">
  <div className="factory-heading"><div><div className="eyebrow">THE ATSTUDIO COLLECTION</div><h2>Find your frequency.</h2></div><button disabled={disabled} onClick={onLibrary}><FolderOpen size={15}/> My presets</button></div>
  <p className="factory-description">Nine complete looks. One click to make it yours.</p>
  <div className="factory-grid">{factoryPresets.map(p=><button key={p.id} className="factory-card" aria-pressed={selected===p.name} aria-label={'Apply '+p.name+' preset'} disabled={disabled} onClick={()=>onApply(p)}>
   <span className="factory-art"><Preview preset={p}/><span className="factory-category">{p.category}</span>{selected===p.name&&<span className="factory-applied"><Check size={12}/> Applied</span>}</span>
   <span className="factory-caption"><span className="factory-title"><b>{p.name}</b><span className="factory-swatches" aria-hidden="true"><i style={{background:p.settings.color}}/><i style={{background:p.settings.color2}}/></span></span><span className="factory-detail">{p.description}</span><span className="factory-style">{spectrumStyles.find(style=>style.id===p.settings.style)?.name} spectrum</span></span>
  </button>)}</div>
  <p className="factory-note">Style previews are illustrative. Your song, artwork, crop, titles, and export size stay in place. Every look is fully editable.</p>
 </section>;
}
