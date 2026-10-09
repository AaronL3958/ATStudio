import {ApiError,db,handle,identity} from '../../../../common';
import {accessiblePost,shareKinds,streamMedia} from '../../../common';
type Context={params:Promise<{id:string;kind:string}>};
export async function GET(req:Request,ctx:Context){return handle(async()=>{
 const viewer=await identity(req),{id,kind}=await ctx.params,post=await accessiblePost(id,viewer);
 const revision=new URL(req.url).searchParams.get('v');if(revision&&revision!==post.revision)throw new ApiError(409,'This visualizer was updated. Reload to play the latest version.');
 if(kind==='cover'||kind==='motion')return streamMedia(req,kind==='cover'?post.cover_key:post.analysis_key,kind==='cover'?'image/jpeg':'application/octet-stream');
 if(!(shareKinds as readonly string[]).includes(kind))throw new ApiError(404,'Preview file not found.');
 const asset=await db().prepare('SELECT object_key,type FROM assets WHERE id=? AND owner=? AND project_id=? AND kind=?').bind(JSON.parse(post.assets)[kind]||'',post.owner,post.project_id,kind).first<{object_key:string;type:string}>();
 if(!asset)throw new ApiError(404,'Preview file not found.');return streamMedia(req,asset.object_key,asset.type);
})}
export const HEAD=GET;
