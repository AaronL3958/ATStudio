export const animationStyles=[
 {id:'none',name:'None'},
 {id:'fade',name:'Soft fade'},
 {id:'zoom',name:'Zoom & fade'},
 {id:'slide',name:'Float & fade'},
 {id:'spin',name:'Turn & fade'},
] as const;
export type AnimationStyle=typeof animationStyles[number]['id'];
export type AnimationSettings={introStyle:AnimationStyle;outroStyle:AnimationStyle;introDuration:number;outroDuration:number;animateText:boolean;fadeBackground:boolean};
export const animationDefaults:AnimationSettings={introStyle:'zoom',outroStyle:'fade',introDuration:2,outroDuration:2,animateText:true,fadeBackground:false};
export function sequenceTiming(s:AnimationSettings,duration:number){
 const intro=s.introStyle==='none'?0:s.introDuration,outro=s.outroStyle==='none'?0:s.outroDuration;
 // Very short songs still reach the fully revealed state; transitions never overlap.
 const factor=intro+outro>duration?Math.max(0,duration)/(intro+outro):1;
 return{intro:intro*factor,outro:outro*factor};
}
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t)};
export function sequenceAnimation(time:number,duration:number|undefined,s:AnimationSettings){
 const result={opacity:1,scale:1,y:0,rotation:0};
 // Project thumbnails have no song clock and should show the finished artwork.
 if(duration===undefined||!Number.isFinite(duration)||duration<=0)return result;
 const {intro,outro}=sequenceTiming(s,duration);
 let progress=1,style:AnimationStyle='none',leaving=false;
 if(intro>0&&time<intro){progress=smooth(time/intro);style=s.introStyle;}
 else if(outro>0&&time>duration-outro){progress=smooth((duration-time)/outro);style=s.outroStyle;leaving=true;}
 result.opacity=progress;
 if(style==='zoom')result.scale=.55+.45*progress;
 if(style==='slide')result.y=(leaving?-1:1)*(1-progress)*.22;
 if(style==='spin'){result.rotation=(leaving?1:-1)*(1-progress)*Math.PI*.65;result.scale=.75+.25*progress;}
 return result;
}
