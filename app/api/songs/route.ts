import {ApiError,bucket,db,handle,identity,json} from '../common';
export async function GET(req:Request){return handle(async()=>{
 const owner=await identity(req),hash=new URL(req.url).searchParams.get('hash');
 if(hash)return json({song:await db().prepare('SELECT id,name,type,size,created_at FROM songs WHERE owner=? AND hash=?').bind(owner,hash).first()});
 const saved=await db().prepare('SELECT id,name,type,size,created_at,hash FROM songs WHERE owner=? ORDER BY created_at DESC LIMIT 500').bind(owner).all();
 // Older projects are discoverable immediately; choosing one preserves it in the library.
 const legacy=await db().prepare("SELECT a.id,a.name,a.type,a.size,p.updated_at AS created_at,1 AS legacy FROM assets a JOIN projects p ON p.id=a.project_id WHERE a.owner=? AND a.kind='audio' AND NOT EXISTS(SELECT 1 FROM songs s WHERE s.owner=a.owner AND s.object_key=a.object_key) ORDER BY p.updated_at DESC LIMIT 500").bind(owner).all();
 return json({songs:[...saved.results.map(row=>{let name=String(row.name);if(String(row.hash).startsWith('asset:'))try{name=decodeURIComponent(name)}catch{}const {hash,...rest}=row;return{...rest,name}}),...legacy.results]});
})}
export async function POST(req:Request){return handle(async()=>{
 const owner=await identity(req),hash=new URL(req.url).searchParams.get('hash')||'',type=(req.headers.get('content-type')||'application/octet-stream').split(';')[0],size=Number(req.headers.get('content-length'));
 if(!/^[a-f0-9]{64}$/.test(hash))throw new ApiError(400,'Invalid audio fingerprint.');
 const existing=await db().prepare('SELECT id,name,type,size FROM songs WHERE owner=? AND hash=?').bind(owner,hash).first();if(existing)return json({song:existing});
 if(!type.startsWith('audio/')&&type!=='application/octet-stream')throw new ApiError(400,'Choose an audio file.');
 if(!req.body||!Number.isSafeInteger(size)||size<=0||size>100*1024*1024)throw new ApiError(413,'Choose audio under 100 MB.');
 let name='Audio track';try{name=decodeURIComponent(req.headers.get('x-file-name')||name).slice(0,200)}catch{throw new ApiError(400,'Invalid filename.')}
 const id=crypto.randomUUID(),key=`${owner}/songs/${id}`,bounded=new FixedLengthStream(size),pumping=req.body.pipeTo(bounded.writable);
 // R2 verifies the SHA-256 checksum while streaming, without buffering the song in the Worker.
 await Promise.all([bucket().put(key,bounded.readable,{sha256:hash,httpMetadata:{contentType:type}}),pumping]);
 try{await db().prepare('INSERT INTO songs(id,owner,hash,name,type,size,object_key,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner,hash) DO NOTHING').bind(id,owner,hash,name,type,size,key,Date.now()).run();const song=await db().prepare('SELECT id,name,type,size FROM songs WHERE owner=? AND hash=?').bind(owner,hash).first();if(song?.id!==id)await bucket().delete(key);return json({song},201)}catch(e){await bucket().delete(key);throw e}
})}
