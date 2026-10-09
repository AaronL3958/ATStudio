import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const base='http://127.0.0.1:5173';
async function create(){const username='prefs_'+randomBytes(5).toString('hex'),password=randomBytes(24).toString('hex'),r=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(r.status,200);return {username,password,cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')}}
const a=await create(),b=await create();
const req=(path,{cookie=a.cookie,method='GET',data,origin=base}={})=>fetch(base+path,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
const preferences={theme:'night',accent:'#367c95',reducedMotion:true};
assert.equal((await req('/api/preferences',{method:'PUT',data:preferences})).status,200);
assert.deepEqual((await(await req('/api/preferences')).json()).preferences,preferences);
assert.equal((await(await req('/api/preferences',{cookie:b.cookie})).json()).preferences.theme,'beige');
assert.equal((await req('/api/preferences',{cookie:'atstudio_guest=1'})).status,401);
assert.equal((await req('/api/preferences',{method:'PUT',data:preferences,origin:'https://example.com'})).status,403);
assert.equal((await req('/api/preferences',{method:'PUT',data:{...preferences,accent:'url(javascript:test)'}})).status,400);
for(const action of ['login','register','recover'])assert.equal((await req('/api/account/'+action,{method:'POST',data:{username:b.username,password:b.password}})).status,409);
const html=await(await req('/')).text();assert(html.includes(a.username));assert(!html.includes('Sign in / create account'),'Signed-in homepage must not offer registration');
assert.equal((await req('/api/account/logout',{method:'POST'})).status,200);
const login=await req('/api/account/login',{cookie:'atstudio_guest=1',method:'POST',data:{username:a.username,password:a.password}});assert.equal(login.status,200);const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
assert.deepEqual((await(await req('/api/preferences',{cookie})).json()).preferences,preferences,'Preferences survive signing out and back in');
console.log('PASS: account-isolated settings, validation, CSRF, signed-in auth guard, homepage identity, and persistence across login.');
