import {ApiError,bucket,db} from '../common';
import type {GalleryPost} from '../../gallery-data';
export type PostRow={id:string;project_id:string;owner:string;author:string;title:string;description:string;settings:string;assets:string;cover_key:string;analysis_key:string;duration:number;published:number;created_at:number;updated_at:number;revision:string};
export const shareKinds=['audio','background','center','font'] as const;
export function present(row:PostRow,viewer:string,detail=false):GalleryPost{
 const settings=JSON.parse(row.settings),assets=JSON.parse(row.assets);
 return {id:row.id,title:row.title,description:row.description,author:row.author,published:!!row.published,mine:row.owner===viewer,style:settings.style,duration:row.duration,created_at:row.created_at,updated_at:row.updated_at,revision:row.revision,...(row.owner===viewer?{project_id:row.project_id}:{}),...(detail?{settings,media:Object.keys(assets)}:{})};
}
export async function accessiblePost(id:string,viewer:string){
 const row=await db().prepare('SELECT * FROM gallery_posts WHERE id=? AND (published=1 OR owner=?)').bind(id,viewer).first<PostRow>();
 if(!row)throw new ApiError(404,'This visualizer is private or no longer available.');return row;
}
export async function limitedBody(req:Request){
 const limit=5500000;if(Number(req.headers.get('content-length'))>limit)throw new ApiError(413,'Gallery upload is too large.');
 const reader=req.body?.getReader();if(!reader)throw new ApiError(400,'Missing gallery data.');
 let total=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();throw new ApiError(413,'Gallery upload is too large.')}chunks.push(value)}
 const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 try{const value=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value}catch{throw new ApiError(400,'Invalid gallery data.')}
}
export function decodeBase64(value:unknown,max:number){
 if(typeof value!=='string'||value.length>Math.ceil(max/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw new ApiError(400,'Invalid preview upload.');
 try{const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));if(bytes.length>max)throw Error();return bytes}catch{throw new ApiError(400,'Invalid preview upload.')}
}
// Every media request rechecks membership and publication; private project URLs stay private.
export async function streamMedia(req:Request,key:string,type:string){
 const meta=await bucket().head(key);if(!meta)throw new ApiError(404,'Preview file unavailable.');
 const headers=new Headers({'Content-Type':type,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});
 let range:{offset:number;length:number}|undefined;
 const raw=req.headers.get('range');
 if(raw){const m=/^bytes=(\d*)-(\d*)$/.exec(raw);let start=0,end=meta.size-1;
  if(!m||(!m[1]&&!m[2])){headers.set('Content-Range',`bytes */${meta.size}`);return new Response(null,{status:416,headers})}
  if(m[1]){start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]))}else start=Math.max(0,meta.size-Number(m[2]));
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=meta.size){headers.set('Content-Range',`bytes */${meta.size}`);return new Response(null,{status:416,headers})}
  range={offset:start,length:end-start+1};headers.set('Content-Range',`bytes ${start}-${end}/${meta.size}`);
 }
 headers.set('Content-Length',String(range?.length??meta.size));
 if(req.method==='HEAD')return new Response(null,{status:range?206:200,headers});
 const object=await bucket().get(key,range?{range}:undefined);if(!object)throw new ApiError(404,'Preview file unavailable.');
 return new Response(object.body,{status:range?206:200,headers});
}
