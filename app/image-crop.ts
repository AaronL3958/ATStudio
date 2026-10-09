export type Crop = {zoom:number;x:number;y:number};
export const defaultCrop:Crop={zoom:1,x:50,y:50};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

// Source-space crop, shared by the editor, live preview, thumbnails and MP4.
// Position describes the available travel, so even extreme drags stay covered.
export function cropRect(iw:number,ih:number,aspect:number,crop:Crop){
 const zoom=clamp(crop.zoom,1,5);
 const width=Math.min(iw,ih*aspect)/zoom,height=width/aspect;
 return {sx:(iw-width)*clamp(crop.x,0,100)/100,sy:(ih-height)*clamp(crop.y,0,100)/100,sw:width,sh:height};
}
export function cover(c:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number,crop:Crop=defaultCrop){
 const {sx,sy,sw,sh}=cropRect(img.naturalWidth||img.width,img.naturalHeight||img.height,w/h,crop);
 c.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
