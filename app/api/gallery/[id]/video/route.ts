import {ApiError,body,bucket,db,handle,identity,json} from '../../../common';
import {present,type PostRow} from '../../common';
type Context={params:Promise<{id:string}>};
// Rendering happens in the browser. Stream the bounded upload directly to storage.
export async function POST(req:Request,ctx:Context){return handle(async()=>{
 const owner=await identity(req),{id}=await ctx.params;
 const row=await db().prepare('SELECT * FROM gallery_posts WHERE id=? AND owner=?').bind(id,owner).first<PostRow>();
 if(!row)throw new ApiError(404,'Post not found.');
 if(!row.published||req.headers.get('x-post-revision')!==row.revision)throw new ApiError(409,'The gallery post changed. Reopen Share and retry.');
 if(req.headers.get('x-public-sharing')!=='enabled')throw new ApiError(400,'Enable public video sharing first.');
 const length=Number(req.headers.get('content-length'));
 if(!Number.isSafeInteger(length)||length<24||length>90_000_000)throw new ApiError(413,'The shared video must be under 90 MB. Try rendering it again.');
 if(req.headers.get('content-type')!=='video/mp4'||!req.body)throw new ApiError(400,'Choose an MP4 video.');
 const token=crypto.randomUUID(),key=`gallery/${owner}/${id}/${token}.mp4`;
 let prefix=new Uint8Array(0);
 const inspect=new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){
  if(prefix.length<12){const next=new Uint8Array(Math.min(12,prefix.length+chunk.length));next.set(prefix);next.set(chunk.subarray(0,next.length-prefix.length),prefix.length);prefix=next;if(prefix.length===12&&new TextDecoder().decode(prefix.subarray(4,8))!=='ftyp')throw new ApiError(400,'Invalid MP4 video.');}
  controller.enqueue(chunk);
 }});
 const bounded=new FixedLengthStream(length);
 try{
  await Promise.all([bucket().put(key,bounded.readable,{httpMetadata:{contentType:'video/mp4'}}),req.body.pipeThrough(inspect).pipeTo(bounded.writable)]);
  // A withdrawal, deletion, republication, or competing upload must never resurrect a link.
  const result=await db().prepare('UPDATE gallery_posts SET video_key=?,video_token=?,video_size=? WHERE id=? AND owner=? AND revision=? AND published=1 AND video_key IS ?').bind(key,token,length,id,owner,row.revision,row.video_key).run();
  if(!result.meta.changes)throw new ApiError(409,'Sharing changed during upload. Reopen Share and retry.');
 }catch(e){await bucket().delete(key).catch(()=>{});throw e}
 if(row.video_key)await bucket().delete(row.video_key).catch(()=>{});
 return json({post:present({...row,video_key:key,video_token:token,video_size:length},owner)},201);
})}
export async function DELETE(req:Request,ctx:Context){return handle(async()=>{
 const owner=await identity(req),{id}=await ctx.params,data=await body(req);
 if(typeof data.revision!=='string'||typeof data.token!=='string')throw new ApiError(400,'Missing video version.');
 const row=await db().prepare('UPDATE gallery_posts SET video_key=NULL,video_token=NULL,video_size=NULL WHERE id=? AND owner=? AND revision=? AND video_token=? RETURNING *').bind(id,owner,data.revision,data.token).first<PostRow>();
 if(!row)throw new ApiError(409,'Sharing changed. Reopen Share and retry.');
 // The old key is derived from a server-issued UUID, scoped to this owner and post.
 await bucket().delete(`gallery/${owner}/${id}/${data.token}.mp4`).catch(()=>{});
 return json({post:present(row,owner)});
})}
