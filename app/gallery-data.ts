import type {Settings,Analysis} from './visualizer';
export type GalleryPost={id:string;title:string;description:string;author:string;published:boolean;mine:boolean;style:string;duration:number;created_at:number;updated_at:number;revision:string;project_id?:string;settings?:Settings;media?:string[]};
export async function galleryRequest(path:string,init?:RequestInit){
 const r=await fetch(path,init),data=await r.json() as {error?:string;post:GalleryPost;posts:GalleryPost[];next:string|null};
 if(!r.ok)throw new Error(data.error||'Could not load the gallery. Please retry.');
 return data as {post:GalleryPost;posts:GalleryPost[];next:string|null};
}
export function packAnalysis(a:Analysis){
 const bytes=new Uint8Array(16+a.frames.length*96),header=new DataView(bytes.buffer);
 bytes.set([65,84,83,49]);header.setFloat32(4,a.duration,true);header.setUint32(8,a.rate,true);header.setUint32(12,a.frames.length,true);
 a.frames.forEach((frame,i)=>{for(let b=0;b<96;b++)bytes[16+i*96+b]=Math.round(Math.max(0,Math.min(1,frame[b]))*255)});
 return bytes;
}
export function analysisHeader(bytes:Uint8Array){
 if(bytes.length<16||bytes[0]!==65||bytes[1]!==84||bytes[2]!==83||bytes[3]!==49)throw new Error('Invalid visualizer motion data.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),duration=view.getFloat32(4,true),rate=view.getUint32(8,true),count=view.getUint32(12,true);
 if(!Number.isFinite(duration)||duration<=0||duration>600.001||rate!==60||count<1||count>36000||Math.abs(count-duration*rate)>1.01||bytes.length!==16+count*96)throw new Error('Invalid visualizer motion data.');
 return {duration,rate,count};
}
export function unpackAnalysis(bytes:Uint8Array):Analysis{
 const {duration,rate,count}=analysisHeader(bytes);
 return {duration,rate,wave:[],frames:Array.from({length:count},(_,i)=>Float32Array.from(bytes.subarray(16+i*96,16+(i+1)*96),v=>v/255))};
}
export function bytesToBase64(bytes:Uint8Array){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
