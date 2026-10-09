import {ApiError,bucket,db,handle,identity,json,projectName,settings} from '../common';
import {getAppUser} from '../../account-auth';
import {analysisHeader} from '../../gallery-data';
import {decodeBase64,limitedBody,present,shareKinds,type PostRow} from './common';

export async function GET(req:Request){return handle(async()=>{
 const viewer=await identity(req),url=new URL(req.url),project=url.searchParams.get('project');
 if(project){const row=await db().prepare('SELECT * FROM gallery_posts WHERE project_id=? AND owner=?').bind(project,viewer).first<PostRow>();return json({post:row?present(row,viewer):null})}
 const mine=url.searchParams.get('mine')==='1',query=(url.searchParams.get('q')||'').trim().slice(0,100),cursor=url.searchParams.get('cursor');
 let where=mine?'owner=?':'published=1';const args:(string|number)[]=mine?[viewer]:[];
 if(query){where+=" AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\')";const q='%'+query.replace(/[\\%_]/g,'\\$&')+'%';args.push(q,q)}
 if(cursor){let c;try{c=JSON.parse(atob(cursor))}catch{throw new ApiError(400,'Invalid gallery page.')};if(!Array.isArray(c)||c.length!==2||!Number.isSafeInteger(c[0])||typeof c[1]!=='string'||c[1].length>40)throw new ApiError(400,'Invalid gallery page.');where+=' AND (created_at<? OR (created_at=? AND id<?))';args.push(c[0],c[0],c[1])}
 const rows=await db().prepare(`SELECT * FROM gallery_posts WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 25`).bind(...args).all<PostRow>(),items=rows.results.slice(0,24),last=items.at(-1);
 return json({posts:items.map(row=>present(row,viewer)),next:rows.results.length>24&&last?btoa(JSON.stringify([last.created_at,last.id])):null});
})}
export async function POST(req:Request){return handle(async()=>{
 const owner=await identity(req),data=await limitedBody(req),title=projectName(data.title);
 if(typeof data.description!=='string'||data.description.length>1000)throw new ApiError(400,'Keep the description under 1,000 characters.');
 if(typeof data.project!=='string'||!Number.isInteger(data.version))throw new ApiError(400,'Save your project before sharing.');
 const project=await db().prepare('SELECT * FROM projects WHERE id=? AND owner=?').bind(data.project,owner).first<{id:string;version:number;settings:string;assets:string}>();
 if(!project)throw new ApiError(404,'Project not found.');if(project.version!==data.version)throw new ApiError(409,'The project changed. Save your current version and share again.');
 const refs=JSON.parse(project.assets),shared:Record<string,string>={};
 if(!refs.audio)throw new ApiError(400,'Upload your own track before publishing a visualizer.');
 for(const kind of shareKinds){if(!refs[kind])continue;const file=await db().prepare('SELECT id FROM assets WHERE id=? AND project_id=? AND owner=? AND kind=?').bind(refs[kind],project.id,owner,kind).first();if(!file)throw new ApiError(400,'A project file is missing. Save your project again.');shared[kind]=refs[kind]}
 const motion=decodeBase64(data.motion,3456016);let duration:number;try{duration=analysisHeader(motion).duration}catch(e){throw new ApiError(400,(e as Error).message)}
 const cover=decodeBase64(data.cover,400000);if(cover.length<4||cover[0]!==255||cover[1]!==216||cover[2]!==255)throw new ApiError(400,'Invalid gallery cover image.');
 const old=await db().prepare('SELECT * FROM gallery_posts WHERE project_id=? AND owner=?').bind(project.id,owner).first<PostRow>();
 if(old?(data.revision!==old.revision):data.revision)throw new ApiError(409,'Sharing changed in another tab. Reopen Share to see the latest version.');
 const count=await db().prepare('SELECT COUNT(*) AS n FROM gallery_posts WHERE owner=?').bind(owner).first<{n:number}>();if(!old&&(count?.n??0)>=100)throw new ApiError(400,'Your gallery supports up to 100 projects.');
 const id=old?.id||crypto.randomUUID(),revision=crypto.randomUUID(),prefix=`gallery/${owner}/${id}/${revision}`,coverKey=prefix+'.jpg',analysisKey=prefix+'.ats',now=Date.now();
 const user=await getAppUser(),author=(user?.name||'ATStudio creator').split('@')[0].slice(0,80),snapshot=settings(JSON.parse(project.settings));snapshot.sourceUrl='';
 try{
  await Promise.all([bucket().put(coverKey,cover,{httpMetadata:{contentType:'image/jpeg'}}),bucket().put(analysisKey,motion,{httpMetadata:{contentType:'application/octet-stream'}})]);
  // The project/version predicate also closes the gap if the project is deleted during upload.
  const result=old?await db().prepare('UPDATE gallery_posts SET title=?,description=?,author=?,settings=?,assets=?,cover_key=?,analysis_key=?,duration=?,published=1,updated_at=?,revision=? WHERE id=? AND owner=? AND revision=? AND EXISTS(SELECT 1 FROM projects WHERE id=? AND owner=? AND version=?)').bind(title,data.description.trim(),author,JSON.stringify(snapshot),JSON.stringify(shared),coverKey,analysisKey,duration,now,revision,id,owner,old.revision,project.id,owner,project.version).run():await db().prepare('INSERT INTO gallery_posts(id,project_id,owner,author,title,description,settings,assets,cover_key,analysis_key,duration,published,created_at,updated_at,revision) SELECT ?,?,?,?,?,?,?,?,?,?,?,1,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND owner=? AND version=?) ON CONFLICT(project_id) DO NOTHING').bind(id,project.id,owner,author,title,data.description.trim(),JSON.stringify(snapshot),JSON.stringify(shared),coverKey,analysisKey,duration,now,now,revision,project.id,owner,project.version).run();
  if(!result.meta.changes)throw new ApiError(409,'The project or sharing settings changed. Reopen Share and retry.');
 }catch(e){await Promise.allSettled([bucket().delete(coverKey),bucket().delete(analysisKey)]);throw e}
 if(old)await Promise.allSettled([bucket().delete(old.cover_key),bucket().delete(old.analysis_key)]);
 const row=await db().prepare('SELECT * FROM gallery_posts WHERE id=?').bind(id).first<PostRow>();return json({post:present(row!,owner)},old?200:201);
})}
