import type {BassEffectState} from './bass-effects';
export type BackgroundMotionSettings={backgroundShake:boolean;backgroundShakeAmount:number;backgroundShakeSpeed:number;backgroundShakeSensitivity:number;backgroundShakeZoom:number};
export const backgroundMotionDefaults:BackgroundMotionSettings={backgroundShake:false,backgroundShakeAmount:14,backgroundShakeSpeed:9,backgroundShakeSensitivity:1,backgroundShakeZoom:2};
export function backgroundMotion(time:number,bass:BassEffectState,s:BackgroundMotionSettings){
 const level=s.backgroundShake?Math.min(1,Math.max(0,bass.level)*s.backgroundShakeSensitivity):0;
 if(level===0)return {x:0,y:0,scale:1};
 const phase=Math.max(0,time)*Math.PI*2*s.backgroundShakeSpeed,amount=s.backgroundShakeAmount*level;
 return {x:amount*(.7*Math.sin(phase)+.3*Math.sin(phase*.61)),y:amount*(.65*Math.sin(phase*1.19)+.35*Math.sin(phase*.73)),scale:1+s.backgroundShakeZoom/100*level};
}

/** Three separable box passes approximate a Gaussian without Canvas2D.filter.
 * Edge replication keeps opaque artwork opaque. Work is independent of radius.
 */
export function blurPixels(source:Uint8ClampedArray,width:number,height:number,sigma:number){
 if(source.length!==width*height*4)throw new Error('Invalid background pixels.');
 const result=new Uint8ClampedArray(source);if(sigma<=0)return result;
 let lower=Math.floor(Math.sqrt(4*sigma*sigma+1));if(lower%2===0)lower--;lower=Math.max(1,lower);
 const upper=lower+2,count=Math.round((12*sigma*sigma-3*lower*lower-12*lower-9)/(-4*lower-4));
 const work=new Uint8ClampedArray(source.length);
 function pass(input:Uint8ClampedArray,output:Uint8ClampedArray,radius:number,horizontal:boolean){
  const length=horizontal?width:height,lines=horizontal?height:width,stride=horizontal?4:width*4,step=horizontal?width*4:4,diameter=radius*2+1;
  for(let line=0;line<lines;line++)for(let channel=0;channel<4;channel++){
   const start=line*step+channel;let sum=0;
   for(let j=-radius;j<=radius;j++)sum+=input[start+Math.max(0,Math.min(length-1,j))*stride];
   for(let i=0;i<length;i++){
    output[start+i*stride]=sum/diameter;
    sum+=input[start+Math.min(length-1,i+radius+1)*stride]-input[start+Math.max(0,i-radius)*stride];
   }
  }
 }
 for(let n=0;n<3;n++){const radius=((n<count?lower:upper)-1)/2;pass(result,work,radius,true);pass(work,result,radius,false)}
 return result;
}
