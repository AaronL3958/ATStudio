import {ApiError,db,handle,identity,json} from '../../common';
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{
 const owner=await identity(req),{id}=await params,result=await db().prepare('DELETE FROM presets WHERE id=? AND owner=?').bind(id,owner).run();
 if(!result.meta.changes)throw new ApiError(404,'Preset not found.');return json({deleted:true});
})}
