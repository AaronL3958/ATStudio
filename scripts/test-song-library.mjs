import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
const base='http://127.0.0.1:5173';
async function account(){const r=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:'songs_'+randomBytes(5).toString('hex'),password:randomBytes(24).toString('hex')})});assert.equal(r.status,200);return r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')}
// Self-contained one-second PCM fixture; no dependency on another test run.
const audio=Buffer.alloc(44+16000);
audio.write('RIFF',0);audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(8000,24);audio.writeUInt32LE(16000,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(16000,40);
for(let i=0;i<8000;i++)audio.writeInt16LE(Math.round(Math.sin(2*Math.PI*220*i/8000)*8000),44+i*2);
const first=await account(),second=await account(),hash=createHash('sha256').update(audio).digest('hex');
const req=(path,{cookie=first,method='GET',data,raw,origin=base}={})=>fetch(base+path,{method,headers:{Cookie:cookie,Origin:origin,...(data?{'Content-Type':'application/json'}:raw?{'Content-Type':'audio/wav','x-file-name':'QA-song.wav'}:{})},body:data?JSON.stringify(data):raw});
assert.equal((await req('/api/songs',{cookie:''})).status,401);
assert.equal((await req('/api/songs?hash='+hash,{method:'POST',raw:audio,origin:'https://example.com'})).status,403);
const uploaded=await req('/api/songs?hash='+hash,{method:'POST',raw:audio});assert.equal(uploaded.status,201,await uploaded.clone().text());const {song}=await uploaded.json();
const duplicate=await(await req('/api/songs?hash='+hash,{method:'POST',raw:audio})).json();assert.equal(duplicate.song.id,song.id);
assert.equal((await(await req('/api/songs?hash='+hash)).json()).song.id,song.id);
assert.equal((await req('/api/songs/'+song.id,{cookie:second})).status,404);
assert(!(await(await req('/api/songs',{cookie:second})).json()).songs.some(s=>s.id===song.id));
const p1=(await(await req('/api/projects',{method:'POST',data:{name:'Song library QA 1',settings:{}}})).json()).project;
const p2=(await(await req('/api/projects',{method:'POST',data:{name:'Song library QA 2',settings:{}}})).json()).project;
const attach=async p=>{const r=await req('/api/songs/'+song.id,{method:'POST',data:{project:p.id}});assert.equal(r.status,201,await r.clone().text());const asset=await r.json();const saved=await req('/api/projects/'+p.id,{method:'PUT',data:{name:p.name,settings:p.settings,version:p.version,assets:{audio:asset.id}}});assert.equal(saved.status,200);return asset.id};
const asset1=await attach(p1),asset2=await attach(p2);assert.notEqual(asset1,asset2);
assert.equal((await req('/api/songs/'+song.id,{cookie:second,method:'POST',data:{project:p2.id}})).status,404);
assert.equal((await req('/api/projects/'+p1.id,{method:'DELETE'})).status,200);
assert.equal((await req('/api/songs/'+song.id)).status,200);assert.equal((await req('/api/assets/'+asset2)).status,200);
assert.equal((await req('/api/projects/'+p2.id,{method:'DELETE'})).status,200);
assert.deepEqual(Buffer.from(await(await req('/api/songs/'+song.id)).arrayBuffer()),audio);
console.log('PASS: checksum-backed deduplication, account isolation, CSRF, reusable project references, audio survives deletion of both projects.');
