import {cover,type Crop} from './image-crop';
import {blurPixels} from './background-effects';
let filtersWork:boolean|undefined;
function supportsCanvasBlur(){
 if(filtersWork!==undefined)return filtersWork;
 // Test pixels, not property existence: some engines accept filter assignments
 // without applying them. This also works with Safari's fullscreen fallback.
 const source=document.createElement('canvas');source.width=16;source.height=16;
 const sc=source.getContext('2d')!;sc.fillStyle='#fff';sc.fillRect(7,0,2,16);
 const probe=document.createElement('canvas');probe.width=16;probe.height=16;
 const pc=probe.getContext('2d',{willReadFrequently:true})!;
 try{pc.filter='blur(2px)';pc.drawImage(source,0,0);filtersWork=pc.getImageData(4,8,1,1).data[3]>0}catch{filtersWork=false}
 return filtersWork;
}
type Cache={image:HTMLImageElement;key:string;source:HTMLCanvasElement;pixels:Uint8ClampedArray;levels:Map<number,HTMLCanvasElement>;scale:number};
const caches=new WeakMap<HTMLCanvasElement,Cache>();
const radii=[0,2,4,8,12,18,26,38,54,80];
export function drawBlurredBackground(c:CanvasRenderingContext2D,canvas:HTMLCanvasElement,image:HTMLImageElement,crop:Crop,pad:number,blur:number,color:string){
 const w=canvas.width,h=canvas.height,k=h/1080,x=-pad*w/h,y=-pad,width=w+pad*2*w/h,height=h+pad*2;
 if(blur<=0){cover(c,image,x,y,width,height,crop);return}
 if(supportsCanvasBlur()){c.save();c.filter=`blur(${blur*k}px)`;cover(c,image,x,y,width,height,crop);c.restore();return}
 // Cache by artwork/crop/overscan, never by playback time or current bass level.
 // The soft layers are bounded to 640 pixels wide even for a 1440p export.
 const key=[w,h,pad,crop.zoom,crop.x,crop.y,color].join(':');let cache=caches.get(canvas);
 if(!cache||cache.image!==image||cache.key!==key){
  const source=document.createElement('canvas');source.width=Math.min(640,Math.ceil(width));source.height=Math.max(1,Math.round(source.width*height/width));
  const sc=source.getContext('2d',{willReadFrequently:true})!;sc.fillStyle=color;sc.fillRect(0,0,source.width,source.height);cover(sc,image,0,0,source.width,source.height,crop);
  cache={image,key,source,pixels:sc.getImageData(0,0,source.width,source.height).data,levels:new Map(),scale:source.width/width*k};caches.set(canvas,cache);
 }
 const strength=Math.max(0,Math.min(80,blur)),high=radii.find(r=>r>=strength)??80,low=radii[Math.max(0,radii.indexOf(high)-1)],mix=high===low?1:(strength-low)/(high-low);
 const layer=(radius:number)=>{
  let result=cache!.levels.get(radius);if(result)return result;
  result=document.createElement('canvas');result.width=cache!.source.width;result.height=cache!.source.height;
  result.getContext('2d')!.putImageData(new ImageData(blurPixels(cache!.pixels,result.width,result.height,radius*cache!.scale),result.width,result.height),0,0);cache!.levels.set(radius,result);return result;
 };
 // Keep the zero-blur end full resolution, then blend cached blurred layers.
 if(low===0)cover(c,image,x,y,width,height,crop);else c.drawImage(layer(low),x,y,width,height);
 c.save();c.globalAlpha*=mix;c.drawImage(layer(high),x,y,width,height);c.restore();
}
