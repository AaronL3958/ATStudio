import {ApiError,body,db,handle,identity,json} from '../../common';
import {accessiblePost,present,type PostRow} from '../common';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){return handle(async()=>{const viewer=await identity(req),{id}=await ctx.params;return json({post:present(await accessiblePost(id,viewer),viewer,true)})})}
export async function PATCH(req:Request,ctx:Context){return handle(async()=>{
 const owner=await identity(req),{id}=await ctx.params,data=await body(req);
 if(!data||data.published!==false||typeof data.revision!=='string')throw new ApiError(400,'Use Share in Studio to publish a project.');
 const result=await db().prepare('UPDATE gallery_posts SET published=0,updated_at=?,revision=? WHERE id=? AND owner=? AND revision=?').bind(Date.now(),crypto.randomUUID(),id,owner,data.revision).run();
 if(!result.meta.changes){const own=await db().prepare('SELECT id FROM gallery_posts WHERE id=? AND owner=?').bind(id,owner).first();throw new ApiError(own?409:404,own?'Sharing changed in another tab. Refresh and retry.':'Post not found.')}
 return json({post:present((await db().prepare('SELECT * FROM gallery_posts WHERE id=?').bind(id).first<PostRow>())!,owner)});
})}
