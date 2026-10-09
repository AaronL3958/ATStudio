import {ApiError,body,bucket,db,handle,identity,json} from '../../common';
import {accessiblePost,present,type PostRow} from '../common';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){return handle(async()=>{const viewer=await identity(req),{id}=await ctx.params;return json({post:present(await accessiblePost(id,viewer),viewer,true)})})}
export async function PATCH(req:Request,ctx:Context){return handle(async()=>{
 const owner=await identity(req),{id}=await ctx.params,data=await body(req);
 if(!data||data.published!==false||typeof data.revision!=='string')throw new ApiError(400,'Use Share in Studio to publish a project.');
 const old=await db().prepare('SELECT video_key FROM gallery_posts WHERE id=? AND owner=? AND revision=?').bind(id,owner,data.revision).first<{video_key:string|null}>();
 const result=await db().prepare('UPDATE gallery_posts SET published=0,updated_at=?,revision=?,video_key=NULL,video_token=NULL,video_size=NULL WHERE id=? AND owner=? AND revision=?').bind(Date.now(),crypto.randomUUID(),id,owner,data.revision).run();
 if(!result.meta.changes){const own=await db().prepare('SELECT id FROM gallery_posts WHERE id=? AND owner=?').bind(id,owner).first();throw new ApiError(own?409:404,own?'Sharing changed in another tab. Refresh and retry.':'Post not found.')}
 if(old?.video_key)await bucket().delete(old.video_key).catch(()=>{});
 return json({post:present((await db().prepare('SELECT * FROM gallery_posts WHERE id=?').bind(id).first<PostRow>())!,owner)});
})}

export async function DELETE(req:Request,ctx:Context){return handle(async()=>{
 const owner=await identity(req),{id}=await ctx.params,data=await body(req);
 if(typeof data.revision!=='string')throw new ApiError(400,'Missing post version.');
 const row=await db().prepare('DELETE FROM gallery_posts WHERE id=? AND owner=? AND revision=? RETURNING *').bind(id,owner,data.revision).first<PostRow>();
 if(!row){const own=await db().prepare('SELECT id FROM gallery_posts WHERE id=? AND owner=?').bind(id,owner).first();throw new ApiError(own?409:404,own?'Sharing changed. Refresh and retry.':'Post not found.')}
 await bucket().delete([row.cover_key,row.analysis_key,...(row.video_key?[row.video_key]:[])]);
 return json({deleted:true});
})}
