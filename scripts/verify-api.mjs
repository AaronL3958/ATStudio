import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const signin=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=signin.headers.get('set-cookie')?.split(';')[0];assert(cookie,'Local sign-in must provide a session');
const call=(path,method='GET',data,extra={})=>fetch(base+path,{method,headers:{Cookie:cookie,Origin:base,...(data?{'Content-Type':'application/json'}:{}),...extra},body:data?JSON.stringify(data):undefined});
const anonymous=await fetch(base+'/api/projects');assert.equal(anonymous.status,401);
const cross=await call('/api/projects','POST',{name:'wrong',settings:{}},{Origin:'https://example.com'});assert.equal(cross.status,403);
const invalid=await call('/api/projects','POST',{name:'invalid',settings:{bass:99}});assert.equal(invalid.status,400);
const created=await call('/api/projects','POST',{name:'Automated QA fixture',settings:{}});const result=await created.json();assert.equal(created.status,201,JSON.stringify(result));const p=result.project;
try{
 const list=await (await call('/api/projects')).json();assert(list.projects.some(x=>x.id===p.id));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xVIAAAAASUVORK5CYII=','base64');
 const uploaded=await fetch(base+`/api/assets?project=${p.id}&kind=background`,{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'image/png','x-file-name':'qa.png'},body:png});const asset=await uploaded.json();assert.equal(uploaded.status,201,JSON.stringify(asset));
 const retrieved=await call('/api/assets/'+asset.id);assert.equal(retrieved.status,200);assert.deepEqual(Buffer.from(await retrieved.arrayBuffer()),png);
 assert.equal((await fetch(base+'/api/assets/'+asset.id)).status,401);
 const saved=await call('/api/projects/'+p.id,'PUT',{name:p.name,settings:{...p.settings,bass:2.2},assets:{background:asset.id},version:p.version});assert.equal(saved.status,200,await saved.text());
 const reopened=await (await call('/api/projects/'+p.id)).json();assert.equal(reopened.project.settings.bass,2.2);assert.equal(reopened.project.assets.background,asset.id);
 const conflict=await call('/api/projects/'+p.id,'PUT',{name:p.name,settings:p.settings,assets:{},version:p.version});assert.equal(conflict.status,409);
 const foreign=await call('/api/projects/'+p.id,'PUT',{name:p.name,settings:p.settings,assets:{audio:asset.id},version:2});assert.equal(foreign.status,400);
 console.log('PASS: authentication, origin protection, validation, project creation/list/save/reopen, exact upload round-trip, private assets, conflict detection, asset ownership/kind validation.');
}finally{const deleted=await call('/api/projects/'+p.id,'DELETE');assert.equal(deleted.status,200);assert.equal((await call('/api/projects/'+p.id)).status,404);console.log('PASS: test project and uploaded files deleted.');}
