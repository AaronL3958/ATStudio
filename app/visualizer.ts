import {bassEffectDefaults,bassEffects,drawParticles,reactiveBlur,type BassEffectSettings} from './bass-effects';
import {circleMotion,circleMotionDefaults,type CircleMotionSettings} from './circle-motion';
import {cover} from './image-crop';
import {animationDefaults,sequenceAnimation,type AnimationSettings} from './sequence-animation';
export const spectrumStyles=[
 {id:'bloom',name:'Bloom',detail:'Rounded twin peaks'},
 {id:'fluid',name:'Fluid',detail:'Soft flowing outline'},
 {id:'ribbon',name:'Ribbon',detail:'Solid liquid silhouette'},
 {id:'halo',name:'Halo',detail:'Layered luminous rings'},
 {id:'bars',name:'Pillars',detail:'Rounded radial bars'},
 {id:'line',name:'Wave',detail:'Smooth mirrored wave'},
] as const;
export type Settings=AnimationSettings & BassEffectSettings & CircleMotionSettings & {sourceUrl:string;style:typeof spectrumStyles[number]['id'];color:string;color2:string;gradient:boolean;bass:number;mids:number;treble:number;bassCeiling:number;roundness:number;fill:number;smoothing:number;sensitivity:number;radius:number;amplitude:number;thickness:number;glow:number;rotation:number;x:number;y:number;particles:number;pulse:number;blur:number;dim:number;background:string;backgroundZoom:number;backgroundX:number;backgroundY:number;centerZoom:number;centerX:number;centerY:number;text:string;subtitle:string;font:string;fontSize:number;textColor:string;textX:number;textY:number;logoText:string;resolution:number;fps:number};
export const defaults:Settings={...animationDefaults,...bassEffectDefaults,...circleMotionDefaults,sourceUrl:'',style:'bloom',color:'#e5c9a4',color2:'#b78b63',gradient:true,bass:1.6,mids:0,treble:0,bassCeiling:180,roundness:.8,fill:.95,smoothing:.65,sensitivity:1,radius:18,amplitude:85,thickness:3,glow:24,rotation:0,x:50,y:46,particles:45,pulse:.45,blur:0,dim:25,background:'#19120f',backgroundZoom:1,backgroundX:50,backgroundY:50,centerZoom:1,centerX:50,centerY:50,text:'AFTER HOURS',subtitle:'ATSTUDIO  /  ORIGINAL MIX',font:'Arial',fontSize:32,textColor:'#ffffff',textX:50,textY:84,logoText:'AT',resolution:1080,fps:30};
export type Analysis={frames:Float32Array[];duration:number;rate:number;wave:number[]};
export type Artwork={background?:HTMLImageElement;center?:HTMLImageElement};
const N=4096;
function fft(re:Float32Array,im:Float32Array){for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}for(let len=2;len<=N;len<<=1){const ang=-2*Math.PI/len;for(let i=0;i<N;i+=len){let wr=1,wi=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=wr*Math.cos(ang)-wi*Math.sin(ang);wi=wr*Math.sin(ang)+wi*Math.cos(ang);wr=next;}}}}
export async function analyze(buffer:AudioBuffer,onProgress?:(p:number)=>void):Promise<Analysis>{
 const rate=60,frames:Float32Array[]=[],channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 const count=Math.ceil(buffer.duration*rate),win=Float32Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1)));
 for(let f=0;f<count;f++){
  const bins=new Float32Array(96),off=Math.floor(f/rate*buffer.sampleRate)-N/2;
  // Analyze stereo channels separately: out-of-phase bass must not cancel out.
  for(const channel of channels){
   const re=new Float32Array(N),im=new Float32Array(N);
   for(let i=0;i<N;i++)re[i]=(channel[off+i]||0)*win[i];
   fft(re,im);
   for(let b=0;b<96;b++){
    const lo=Math.max(1,Math.ceil(30*Math.pow(600,b/96)*N/buffer.sampleRate)),hi=Math.min(N/2,Math.max(lo,Math.floor(30*Math.pow(600,(b+1)/96)*N/buffer.sampleRate)));
    let peak=0;for(let k=lo;k<=hi;k++)peak=Math.max(peak,Math.hypot(re[k],im[k])*4/N);
    bins[b]=Math.max(bins[b],Math.max(0,Math.min(1,(20*Math.log10(peak+1e-7)+45)/45)));
   }
  }
  frames.push(bins);if(f%60===0){onProgress?.(f/count);await new Promise(r=>setTimeout(r,0));}
 }
 const wave=Array.from({length:220},(_,i)=>{let peak=0;const start=Math.floor(i*buffer.length/220),end=Math.floor((i+1)*buffer.length/220);for(let k=start;k<end;k+=24)peak=Math.max(peak,Math.abs(channels[0][k]));return peak;});
 return{frames,duration:buffer.duration,rate,wave};
}
export function spectrum(a:Analysis|undefined,time:number,s:Settings){
 const out=new Float32Array(96);if(!a?.frames.length)return out;
 const position=Math.min(a.frames.length-1,Math.max(0,time*a.rate)),at=Math.floor(position),mix=position-at;
 const history=1+Math.round(s.smoothing*20),decay=.3+s.smoothing*.62;
 // Only bins entirely inside the bass band enter the visualizer. Mid/treble
 // settings from older projects intentionally have no effect.
 const last=Math.max(1,Math.floor(Math.log((s.bassCeiling??180)/30)/Math.log(600)*96)-1);
 const low=new Float32Array(last+1);let total=0;
 for(let h=0;h<history;h++){
  const weight=decay**h,f=a.frames[Math.max(0,at-h)],next=a.frames[Math.max(0,Math.min(a.frames.length-1,at+1-h))];total+=weight;
  for(let b=0;b<=last;b++)low[b]+=(f[b]*(1-mix)+next[b]*mix)*weight;
 }
 for(let i=0;i<96;i++){
  const p=i/95*last,l=Math.floor(p),fraction=p-l;
  out[i]=Math.min(2,(low[l]*(1-fraction)+low[Math.min(last,l+1)]*fraction)/total*s.bass*s.sensitivity);
 }
 // Gaussian spatial averaging gives broad, rounded movement without spikes.
 const result=new Float32Array(96),width=1+Math.round((s.roundness??.8)*10),sigma=width*.6;
 for(let i=0;i<96;i++){let weightSum=0;for(let j=-width;j<=width;j++){const weight=Math.exp(-j*j/(2*sigma*sigma));result[i]+=out[Math.min(95,Math.max(0,i+j))]*weight;weightSum+=weight;}result[i]/=weightSum;}
 return result;
}
export type Point={x:number;y:number};
export function smoothPath(c:CanvasRenderingContext2D,points:Point[],closed=true){
 if(points.length<2)return;c.beginPath();
 if(closed){const last=points.at(-1)!,first=points[0];c.moveTo((last.x+first.x)/2,(last.y+first.y)/2);for(let i=0;i<points.length;i++){const p=points[i],next=points[(i+1)%points.length];c.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2);}c.closePath();}
 else{c.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length-1;i++){const p=points[i],next=points[i+1];c.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2);}const last=points.at(-1)!;c.lineTo(last.x,last.y);}
}
export function draw(canvas:HTMLCanvasElement,settings:Settings,time:number,a?:Analysis,art:Artwork={},sequenceDuration=a?.duration){
 const s={...defaults,...settings},c=canvas.getContext('2d')!,w=canvas.width,h=canvas.height,k=h/1080,bins=spectrum(a,time,s),bass=bins.reduce((sum,b)=>sum+b,0)/96;
 const effects=bassEffects(a,time,s),backgroundBlur=reactiveBlur(s,effects.level);
 const animation=sequenceAnimation(time,sequenceDuration,s),opacity=animation.opacity;
 c.clearRect(0,0,w,h);c.fillStyle=s.background;c.fillRect(0,0,w,h);
 if(art.background){c.save();c.filter=`blur(${backgroundBlur*k}px)`;const pad=(s.blur+(s.bassBlur?s.bassBlurAmount:0))*k*3;cover(c,art.background,-pad*w/h,-pad,w+pad*2*w/h,h+pad*2,{zoom:s.backgroundZoom,x:s.backgroundX,y:s.backgroundY});c.restore();}
 else{const g=c.createRadialGradient(w*.52,h*.38,0,w*.5,h*.5,w*.7);g.addColorStop(0,s.color2+'30');g.addColorStop(.45,s.background);g.addColorStop(1,'#04080b');c.fillStyle=g;c.fillRect(0,0,w,h);}
 c.fillStyle=`rgba(0,0,0,${s.dim/100})`;c.fillRect(0,0,w,h);
 if(s.fadeBackground&&opacity<1){c.fillStyle=`rgba(0,0,0,${1-opacity})`;c.fillRect(0,0,w,h);}
 const movement=circleMotion(time,effects,s),cx=w*s.x/100+movement.x*k,cy=h*s.y/100+movement.y*k,r=h*s.radius/100*(1+bass*s.pulse*.13);
 // Particles have their own fixed origin; only the centerpiece follows motion.
 drawParticles(c,s,time,effects,w,h,w*s.x/100,h*s.y/100,h*s.radius/100+12*k,opacity);
 c.save();c.globalAlpha=opacity;c.translate(cx,cy+animation.y*h);c.scale(animation.scale,animation.scale);c.rotate(s.rotation*Math.PI/180+animation.rotation+movement.rotation);
 const gradient=c.createLinearGradient(-r,-r,r,r);gradient.addColorStop(0,s.color);gradient.addColorStop(1,s.gradient?s.color2:s.color);
 c.strokeStyle=gradient;c.fillStyle=gradient;c.lineWidth=s.thickness*k;c.lineJoin='round';c.lineCap='round';c.shadowColor=s.color;c.shadowBlur=s.glow*k;
 if(s.style==='line'){
  const points=Array.from({length:96},(_,i)=>({x:(i/95-.5)*w*.8,y:-bins[Math.round(Math.abs(i/95*2-1)*95)]*s.amplitude*k*2}));
  smoothPath(c,points,false);c.stroke();c.globalAlpha=.3*opacity;c.scale(1,-1);c.stroke();
 }else{
  const points:Point[]=[];
  for(let i=0;i<96;i++){
   const angle=i/96*Math.PI*2-Math.PI/2,index=Math.round(Math.abs(Math.sin(angle))*95),b=bins[index];
   let motion=b*1.7;
   if(s.style==='bloom'){
    // Two broad upper lobes and a softer lower skirt. Their height is entirely
    // audio driven, with no synthetic oscillation between beats.
    const top=Math.max(0,-Math.sin(angle)),ears=Math.exp(-(((Math.abs(Math.cos(angle))-.64)/.23)**2))*top;
    motion=bass*(.24+2.5*ears+.38*Math.max(0,Math.sin(angle)))+b*.27;
   }
   const rr=r+5*k+motion*s.amplitude*k,dx=Math.cos(angle),dy=Math.sin(angle);
   if(s.style==='bars'){c.beginPath();c.moveTo(dx*(r+5*k),dy*(r+5*k));c.lineTo(dx*Math.max(r+6*k,rr),dy*Math.max(r+6*k,rr));c.stroke();}
   else points.push({x:dx*rr,y:dy*rr});
  }
  if(s.style!=='bars'){
   smoothPath(c,points);if(s.style==='bloom'||s.style==='ribbon'){c.globalAlpha=s.fill*opacity;c.fill();c.globalAlpha=opacity;}
   c.stroke();
   if(s.style==='halo'){for(let layer=1;layer<=3;layer++){c.globalAlpha=.4/layer*opacity;smoothPath(c,points.map(p=>({x:p.x*(1+layer*.055),y:p.y*(1+layer*.055)})));c.stroke();}c.globalAlpha=opacity;}
  }
  c.shadowBlur=0;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle='#100d0b';c.fill();c.save();c.clip();
  if(art.center)cover(c,art.center,-r,-r,r*2,r*2,{zoom:s.centerZoom,x:s.centerX,y:s.centerY});
  else{c.fillStyle='#f4f9f1';c.font=`900 ${r*.74}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText(s.logoText,0,0,r*1.7);c.font=`${r*.095}px Arial`;c.fillStyle=s.color;c.fillText('S O U N D   I N   M O T I O N',0,r*.48,r*1.7);}
  c.restore();c.strokeStyle=s.color+'90';c.lineWidth=k;c.stroke();
 }
 c.restore();c.save();c.globalAlpha=s.animateText?opacity:1;c.textAlign='center';c.textBaseline='middle';c.fillStyle=s.textColor;c.shadowColor='#000';c.shadowBlur=12*k;c.font=`700 ${s.fontSize*k}px "${s.font}"`;const tx=w*s.textX/100,ty=h*s.textY/100;c.fillText(s.text,tx,ty,w*.92);c.globalAlpha=.65*(s.animateText?opacity:1);c.font=`400 ${Math.max(14,s.fontSize*.43)*k}px "${s.font}"`;c.fillText(s.subtitle,tx,ty+s.fontSize*k*1.15,w*.9);c.restore();
}
export function demoBeat(ctx:AudioContext){const sr=ctx.sampleRate,duration=24,buffer=ctx.createBuffer(2,sr*duration,sr);for(let ch=0;ch<2;ch++){const data=buffer.getChannelData(ch);let seed=42;for(let i=0;i<data.length;i++){const t=i/sr,beat=t%.46875,hat=t%.234375,note=[55,65.406,49,73.416][Math.floor(t/1.875)%4];seed=seed*16807%2147483647;const noise=seed/1073741824-1,kick=Math.sin(2*Math.PI*(48*beat+8*(1-Math.exp(-beat*32))))*Math.exp(-beat*16)*.55,bass=Math.sin(2*Math.PI*note*t)*.16*(1-Math.exp(-beat*24)),hats=noise*Math.exp(-hat*95)*.08,snare=Math.floor(t/.46875)%2?noise*Math.exp(-beat*28)*.12:0,pad=(Math.sin(t*2*Math.PI*note*4+ch*.2)+Math.sin(t*2*Math.PI*note*6))*.025;data[i]=(kick+bass+hats+snare+pad)*Math.min(1,t*4,(duration-t)*3);}}return buffer;}
