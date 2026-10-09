import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base='http://127.0.0.1:5173';
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'}),cookie=login.headers.get('set-cookie')?.split(';')[0];assert(cookie);
const request=(path,{method='GET',data,session=cookie,origin=base}={})=>fetch(base+path,{method,headers:{Cookie:session||'',Origin:origin,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
assert.equal((await request('/api/presets',{session:null})).status,401);
assert.equal((await request('/api/presets',{method:'POST',data:{},origin:'https://example.com'})).status,403);
assert.equal((await request('/api/presets',{method:'POST',data:{name:'Invalid',settings:{circleShake:500}}})).status,400);
const response=await request('/api/presets',{method:'POST',data:{name:'Motion preset QA',settings:{color:'#aabbcc',circleShake:12,circleDrift:30,circlePath:'orbit',text:'Do not copy',sourceUrl:'https://youtu.be/ZhZPxRBP498'}}}),data=await response.json();assert.equal(response.status,201,JSON.stringify(data));const saved=data.preset;
let project;
try{
 assert.equal(saved.settings.circleShake,12);assert.equal(saved.settings.sourceUrl,undefined);assert.equal(saved.settings.text,undefined);
 const list=await (await request('/api/presets')).json();assert(list.presets.some(p=>p.id===saved.id&&p.settings.circleDrift===30));
 const account=await request('/api/account/register',{method:'POST',session:null,data:{username:'presetqa_'+randomBytes(4).toString('hex'),password:randomBytes(24).toString('hex')}});assert.equal(account.status,200);const other=account.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 assert(!(await (await request('/api/presets',{session:other})).json()).presets.some(p=>p.id===saved.id));assert.equal((await request('/api/presets/'+saved.id,{session:other,method:'DELETE'})).status,404);
 const created=await request('/api/projects',{method:'POST',data:{name:'Preset target QA',settings:{...saved.settings,text:'NEW SONG'}}}),p=await created.json();assert.equal(created.status,201,JSON.stringify(p));project=p.project;
 const restored=await (await request('/api/projects/'+project.id)).json();assert.equal(restored.project.settings.circleShake,12);assert.equal(restored.project.settings.circlePath,'orbit');assert.equal(restored.project.settings.text,'NEW SONG');
 console.log('PASS: private persistent presets, unauthenticated and cross-origin rejection, owner isolation, validation, settings-only save, project application and project motion restoration.');
}finally{
 assert.equal((await request('/api/presets/'+saved.id,{method:'DELETE'})).status,200);
 if(project)assert.equal((await request('/api/projects/'+project.id,{method:'DELETE'})).status,200);
}
