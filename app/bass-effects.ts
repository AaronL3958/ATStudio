import type {Analysis} from './visualizer';
export type BassEffectSettings={
 particleDirection:'outward'|'inward'|'up';particleBrightness:number;particleSize:number;particleColor:string;particleSpeed:number;particleBassSpeed:number;particleBassGlow:number;particleTrail:number;
 effectSensitivity:number;effectThreshold:number;effectRelease:number;
 bassBlur:boolean;bassBlurAmount:number;bassBlurSensitivity:number;
};
export const bassEffectDefaults:BassEffectSettings={particleDirection:'outward',particleBrightness:.85,particleSize:3.5,particleColor:'#ffe6c0',particleSpeed:.6,particleBassSpeed:3,particleBassGlow:.65,particleTrail:.35,effectSensitivity:1.6,effectThreshold:.18,effectRelease:.25,bassBlur:false,bassBlurAmount:18,bassBlurSensitivity:1};
type Envelope={key:string;levels:Float32Array;motion:Float32Array;integral:Float64Array};
const envelopes=new WeakMap<Analysis,Envelope>();
export type BassEffectState={level:number;distance:number;motionLevel?:number};

// Integrate velocity over the audio timeline, rather than multiplying position
// by the current bass level. Hits accelerate particles without teleporting them.
// A cached integral keeps scrubbing, live playback and export frame-identical.
export function bassEffects(a:Analysis|undefined,time:number,s:BassEffectSettings&{bassCeiling:number}):BassEffectState{
 if(!a?.frames.length)return{level:0,distance:0};
 const key=[s.bassCeiling,s.effectSensitivity,s.effectThreshold,s.effectRelease].join(':');
 let envelope=envelopes.get(a);
 if(!envelope||envelope.key!==key){
  const levels=new Float32Array(a.frames.length),motion=new Float32Array(a.frames.length),integral=new Float64Array(a.frames.length);
  const last=Math.max(1,Math.floor(Math.log(s.bassCeiling/30)/Math.log(600)*96)-1),attack=Math.exp(-1/(a.rate*.025)),release=Math.exp(-1/(a.rate*s.effectRelease));
  let value=0,motionTarget=0,motionValue=0;
  const motionDecay=Math.exp(-1/(a.rate*.10));
  for(let i=0;i<a.frames.length;i++){
   let raw=0;for(let b=0;b<=last;b++)raw+=a.frames[i][b];raw/=last+1;
   const target=Math.min(1,Math.max(0,(raw-s.effectThreshold)/(1-s.effectThreshold))*s.effectSensitivity),decay=target>value?attack:release;
   value=target+(value-target)*decay;levels[i]=value;
   // Two low-pass stages soften onset and release for the circle independently.
   motionTarget=value+(motionTarget-value)*motionDecay;
   motionValue=motionTarget+(motionValue-motionTarget)*motionDecay;motion[i]=motionValue;
   if(i)integral[i]=integral[i-1]+(levels[i-1]+levels[i])/(2*a.rate);
  }
  envelope={key,levels,motion,integral};envelopes.set(a,envelope);
 }
 const position=Math.max(0,Math.min(a.frames.length-1,time*a.rate)),i=Math.floor(position),fraction=position-i,first=envelope.levels[i],next=envelope.levels[Math.min(i+1,a.frames.length-1)];
 return{level:first+(next-first)*fraction,motionLevel:envelope.motion[i]+(envelope.motion[Math.min(i+1,a.frames.length-1)]-envelope.motion[i])*fraction,distance:envelope.integral[i]+(first*fraction+(next-first)*fraction*fraction/2)/a.rate};
}
export function particleTravel(time:number,bass:BassEffectState,s:BassEffectSettings){return Math.max(0,time)*s.particleSpeed+bass.distance*s.particleBassSpeed;}
export function reactiveBlur(s:BassEffectSettings&{blur:number},level:number){return s.blur+(s.bassBlur?s.bassBlurAmount*Math.min(1,Math.max(0,level)*s.bassBlurSensitivity):0);}
const random=(i:number)=>{const n=Math.sin(i*127.1+31.7)*43758.5453;return n-Math.floor(n)};
export function particlePosition(i:number,travel:number,s:BassEffectSettings,w:number,h:number,cx:number,cy:number,radius:number){
 const phase=(random(i+5)+travel*.055*(.7+random(i+21)*.8))%1,progress=s.particleDirection==='inward'?1-phase:phase;
 const angle=random(i+73)*Math.PI*2,dx=Math.cos(angle),dy=Math.sin(angle);
 const edge=Math.min(dx>0?(w-cx)/dx:dx<0?-cx/dx:Infinity,dy>0?(h-cy)/dy:dy<0?-cy/dy:Infinity),distance=radius+Math.max(h*.1,edge-radius+h*.04)*progress;
 const fade=Math.max(0,Math.min(1,phase*12,(1-phase)*10));
 if(s.particleDirection==='up')return{x:random(i+89)*w,y:h*(1-phase),dx:0,dy:-1,fade,size:.6+random(i+39)*.8};
 const direction=s.particleDirection==='inward'?-1:1;
 return{x:cx+dx*distance,y:cy+dy*distance,dx:dx*direction,dy:dy*direction,fade,size:.6+random(i+39)*.8};
}
export function drawParticles(c:CanvasRenderingContext2D,s:BassEffectSettings&{particles:number},time:number,bass:BassEffectState,w:number,h:number,cx:number,cy:number,radius:number,opacity:number){
 const k=h/1080,travel=particleTravel(time,bass,s),energy=bass.level*s.particleBassGlow;
 c.save();c.fillStyle=s.particleColor;c.strokeStyle=s.particleColor;c.lineCap='round';c.shadowColor=s.particleColor;c.shadowBlur=(4+energy*9)*k;
 for(let i=0;i<Math.round(s.particles*3);i++){
  const p=particlePosition(i,travel,s,w,h,cx,cy,radius),size=s.particleSize*p.size*k*(1+energy*.25);
  c.globalAlpha=Math.min(1,s.particleBrightness*(.55+p.size*.35)*(1+energy))*p.fade*opacity;
  const trail=s.particleTrail*(4+bass.level*s.particleBassSpeed*9)*k;
  if(trail>0){c.lineWidth=Math.max(.5*k,size*.65);c.beginPath();c.moveTo(p.x-p.dx*trail,p.y-p.dy*trail);c.lineTo(p.x,p.y);c.stroke();}
  c.beginPath();c.arc(p.x,p.y,size,0,Math.PI*2);c.fill();
 }
 c.restore();
}
