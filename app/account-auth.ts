import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {createHash,randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {getChatGPTUser} from './chatgpt-auth';

export type AccountUser={userId:string;name:string;email:string;kind:'account'|'chatgpt'};
export const sessionAge=30*24*60*60;
export function token(){return randomBytes(32).toString('hex')}
export function digest(value:string){return createHash('sha256').update(value).digest('hex')}
function derive(password:string,salt:string):Promise<Buffer>{return new Promise((resolve,reject)=>scrypt(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(error,key)=>error?reject(error):resolve(key)))}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `scrypt-16384-8-5$${salt}$${(await derive(password,salt)).toString('hex')}`}
export async function verifyPassword(password:string,hash:string){const [scheme,salt,key]=hash.split('$');if(scheme!=='scrypt-16384-8-5'||!salt||!key)return false;const actual=await derive(password,salt),expected=Buffer.from(key,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export function cookieValue(raw:string|null,name:string){return raw?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||''}
export function accountCookie(req:Request,name:string,value:string,age:number){return `${new URL(req.url).protocol==='https:'?'__Host-':''}${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`}
export async function getAppUser():Promise<AccountUser|null>{
 const h=await headers(),raw=h.get('cookie'),prefix=/^(localhost|127\.0\.0\.1)(:|$)/.test(h.get('host')||'')?'':'__Host-',session=cookieValue(raw,prefix+'atstudio_session');
 // A presented but expired session must never silently switch to another identity.
 if(session){if(!env.DB)throw new Error('Account storage unavailable');if(!/^[a-f0-9]{64}$/.test(session))return null;const row=await env.DB.prepare('SELECT a.owner_key,a.display_name FROM accounts a JOIN account_sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>?').bind(digest(session),Date.now()).first<{owner_key:string;display_name:string}>();return row?{userId:row.owner_key,name:row.display_name,email:'',kind:'account'}:null}
 if(cookieValue(raw,prefix+'atstudio_guest')==='1')return null;
 const legacy=await getChatGPTUser();return legacy?{userId:legacy.userId,name:legacy.displayName,email:legacy.email,kind:'chatgpt'}:null;
}
