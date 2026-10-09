import {ApiError,body,bucket,db,handle,identity,json} from '../../common';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){return handle(async()=>{const owner=await identity(req),{id}=await ctx.params,row=await db().prepare('SELECT object_key,type,name FROM songs WHERE id=? AND owner=?').bind(id,owner).first<{object_key:string;type:string;name:string}>();if(!row)throw new ApiError(404,'Song not found.');const object=await bucket().get(row.object_key);if(!object)throw new ApiError(404,'Audio file unavailable.');return new Response(object.body,{headers:{'Content-Type':row.type,'Content-Length':String(object.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}})})}
export async function POST(req:Request,ctx:Context){return handle(async()=>{
 const owner=await identity(req),{id}=await ctx.params,data=await body(req);
 if(data.adopt){
  const old=await db().prepare("SELECT * FROM assets WHERE id=? AND owner=? AND kind='audio'").bind(id,owner).first<{name:string;type:string;size:number;object_key:string}>();if(!old)throw new ApiError(404,'Song not found.');
  // Preserve the same object; project deletion checks library references before deleting audio.
  let name=old.name;try{name=decodeURIComponent(name)}catch{}
  const songId=crypto.randomUUID();await db().prepare('INSERT INTO songs(id,owner,hash,name,type,size,object_key,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner,hash) DO NOTHING').bind(songId,owner,'asset:'+id,name,old.type,old.size,old.object_key,Date.now()).run();
  return json({song:await db().prepare('SELECT id,name,type,size FROM songs WHERE owner=? AND hash=?').bind(owner,'asset:'+id).first()});
 }
 const song=await db().prepare('SELECT * FROM songs WHERE id=? AND owner=?').bind(id,owner).first<{name:string;type:string;size:number;object_key:string;hash:string}>();if(!song)throw new ApiError(404,'Song not found.');
 const project=await db().prepare('SELECT id FROM projects WHERE id=? AND owner=?').bind(data.project,owner).first();if(!project)throw new ApiError(404,'Project not found.');
 let name=song.name;if(song.hash.startsWith('asset:'))try{name=decodeURIComponent(name)}catch{}
 const asset=crypto.randomUUID();await db().prepare('INSERT INTO assets(id,project_id,owner,kind,name,type,size,object_key) VALUES(?,?,?,?,?,?,?,?)').bind(asset,data.project,owner,'audio',encodeURIComponent(name),song.type,song.size,song.object_key).run();return json({id:asset},201);
})}
