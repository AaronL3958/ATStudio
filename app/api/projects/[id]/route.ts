import {ApiError,body,bucket,db,handle,identity,json,projectName,settings,unpack} from '../../common';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){return handle(async()=>{const owner=await identity(req),{id}=await ctx.params,row=await db().prepare('SELECT * FROM projects WHERE id=? AND owner=?').bind(id,owner).first();if(!row)throw new ApiError(404,'Project not found.');return json({project:unpack(row)})})}
export async function PUT(req:Request,ctx:Context){return handle(async()=>{const owner=await identity(req),{id}=await ctx.params,data=await body(req),name=projectName(data.name),s=settings(data.settings),refs:Record<string,string>={};if(!Number.isInteger(data.version))throw new ApiError(400,'Missing project version.');for(const kind of ['audio','background','center','font']){const asset=data.assets?.[kind];if(asset){if(typeof asset!=='string')throw new ApiError(400,'Invalid asset.');const own=await db().prepare('SELECT id FROM assets WHERE id=? AND owner=? AND project_id=? AND kind=?').bind(asset,owner,id,kind).first();if(!own)throw new ApiError(400,'An uploaded file does not belong to this project.');refs[kind]=asset;}}const now=Date.now(),r=await db().prepare('UPDATE projects SET name=?,settings=?,assets=?,version=version+1,updated_at=? WHERE id=? AND owner=? AND version=?').bind(name,JSON.stringify(s),JSON.stringify(refs),now,id,owner,data.version).run();if(!r.meta.changes){const exists=await db().prepare('SELECT id FROM projects WHERE id=? AND owner=?').bind(id,owner).first();if(!exists)throw new ApiError(404,'Project not found.');throw new ApiError(409,'This project changed in another tab. Save as a new project to keep your edits.');}return json({project:{id,name,settings:s,assets:refs,version:data.version+1,updated_at:now}})})}
export async function DELETE(req:Request,ctx:Context){return handle(async()=>{
 const owner=await identity(req),{id}=await ctx.params;
 const row=await db().prepare('SELECT id FROM projects WHERE id=? AND owner=?').bind(id,owner).first();
 if(!row)throw new ApiError(404,'Project not found.');
 // Revoke the project and all sharing in one transaction, before removing media.
 const [shares,files]=await db().batch([
  db().prepare('DELETE FROM gallery_posts WHERE project_id=? AND owner=? RETURNING cover_key,analysis_key,video_key').bind(id,owner),
  db().prepare('DELETE FROM assets WHERE project_id=? AND owner=? RETURNING object_key').bind(id,owner),
  db().prepare('DELETE FROM projects WHERE id=? AND owner=?').bind(id,owner)
 ]);
 for(const share of shares.results as {cover_key:string;analysis_key:string;video_key:string|null}[])await bucket().delete([share.cover_key,share.analysis_key,...(share.video_key?[share.video_key]:[])]);
 for(const file of files.results as {object_key:string}[]){const saved=await db().prepare('SELECT id FROM songs WHERE object_key=? AND owner=?').bind(file.object_key,owner).first();if(!saved)await bucket().delete(file.object_key)}
 return json({deleted:true});
})}
