import type {BassEffectState} from './bass-effects';
export type CircleMotionSettings={circleShake:number;circleDrift:number;circleTilt:number;circleSpeed:number;circleSensitivity:number;circlePath:'float'|'orbit'|'sway'};
export const circleMotionDefaults:CircleMotionSettings={circleShake:0,circleDrift:0,circleTilt:0,circleSpeed:1,circleSensitivity:1,circlePath:'float'};
// Timeline-based motion keeps seeking, preview and offline exports identical.
// The bass envelope controls displacement and returns the circle to its anchor.
export function circleMotion(time:number,bass:BassEffectState,s:CircleMotionSettings){
 const energy=Math.min(1,Math.max(0,bass.level)*s.circleSensitivity),t=Math.max(0,time)*s.circleSpeed;
 const shakeX=(Math.sin(t*47)+.5*Math.sin(t*71+1))/1.5,shakeY=(Math.cos(t*53+.4)+.5*Math.sin(t*83))/1.5;
 const driftX=s.circlePath==='sway'?Math.sin(t*2.1):s.circlePath==='orbit'?Math.cos(t*1.7):(.65*Math.sin(t*1.3)+.35*Math.sin(t*2.3+.8));
 const driftY=s.circlePath==='sway'?Math.sin(t*1.05)*.15:s.circlePath==='orbit'?Math.sin(t*1.7):(.65*Math.cos(t*1.1)+.35*Math.sin(t*1.9));
 return{x:energy*(s.circleShake*shakeX+s.circleDrift*driftX),y:energy*(s.circleShake*shakeY+s.circleDrift*driftY),rotation:energy*s.circleTilt*Math.sin(t*2.7)*Math.PI/180};
}
