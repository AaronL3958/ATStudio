import {accountCookie,cookieValue,digest,getAppUser,hashPassword,sessionAge,token,verifyPassword} from '../../../account-auth';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {ApiError,body,db,handle,json} from '../../common';
type Account={id:string;owner_key:string;display_name:string;password_hash:string;recovery_hash:string};
async function limit(key:string,max:number){const now=Date.now();const row=await db().prepare('INSERT INTO account_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN expires_at<=? THEN 1 ELSE hits+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING hits').bind(digest(key),now+15*60*1000,now,now).first<{hits:number}>();if(!row||row.hits>max)throw new ApiError(429,'Too many attempts. Please wait 15 minutes and try again.')}
async function session(req:Request,a:Account,recoveryCode?:string){const value=token(),now=Date.now();await db().batch([db().prepare('DELETE FROM account_sessions WHERE expires_at<=?').bind(now),db().prepare('DELETE FROM account_limits WHERE expires_at<=?').bind(now),db().prepare('INSERT INTO account_sessions (token_hash,account_id,expires_at) VALUES (?,?,?)').bind(digest(value),a.id,now+sessionAge*1000)]);const response=json({user:{name:a.display_name,email:'',kind:'account'},...(recoveryCode?{recoveryCode}: {})});response.headers.append('Set-Cookie',accountCookie(req,'atstudio_session',value,sessionAge));response.headers.append('Set-Cookie',accountCookie(req,'atstudio_guest','',0));return response}
export async function GET(){return handle(async()=>{const user=await getAppUser();return json({user:user?{name:user.name,email:user.email,kind:user.kind}:null})})}
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){return handle(async()=>{
 if(req.headers.get('origin')!==new URL(req.url).origin)throw new ApiError(403,'Please submit this form from ATStudio.');
 const {action}=await params;
 if(action==='logout'||action==='legacy'){const value=cookieValue(req.headers.get('cookie'),(new URL(req.url).protocol==='https:'?'__Host-':'')+'atstudio_session');if(value)await db().prepare('DELETE FROM account_sessions WHERE token_hash=?').bind(digest(value)).run();const r=json({ok:true});r.headers.append('Set-Cookie',accountCookie(req,'atstudio_session','',0));r.headers.append('Set-Cookie',accountCookie(req,'atstudio_guest',action==='legacy'?'':'1',action==='legacy'?0:sessionAge));return r}
 if(['register','login','recover'].includes(action)&&(await getAppUser())?.kind==='account')throw new ApiError(409,'You are already signed in. Log out before using another account.');
 if(!['register','login','recover'].includes(action))throw new ApiError(404,'Unknown account action.');
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'Use a JSON account request.');
 const data=await body(req);if(!data||typeof data!=='object'||Array.isArray(data))throw new ApiError(400,'Invalid account request.');const username=typeof data.username==='string'?data.username.trim().toLowerCase():'';
 if(!/^[a-z0-9_]{3,24}$/.test(username))throw new ApiError(400,'Use 3–24 letters, numbers, or underscores for your username.');
 const password=data.password;if(typeof password!=='string'||password.length<12||password.length>128)throw new ApiError(400,'Use a password with 12–128 characters.');
 // Only the edge-supplied client IP is used; never trust X-Forwarded-For.
 await limit('ip:'+(req.headers.get('cf-connecting-ip')||'unknown'),40);await limit('user:'+username,12);
 const existing=await db().prepare('SELECT * FROM accounts WHERE username=?').bind(username).first<Account>();
 if(action==='register'){
  if(existing)throw new ApiError(409,'That username is unavailable. Try another or sign in.');
  const legacy=data.linkLegacy===true?await getChatGPTUser():null;
  if(data.linkLegacy===true&&!legacy)throw new ApiError(401,'Sign in with ChatGPT first to connect your existing projects.');
  const id=crypto.randomUUID(),owner=legacy?.userId||'account:'+id,recoveryCode=token(),passwordHash=await hashPassword(password);
  const inserted=await db().prepare('INSERT INTO accounts (id,username,display_name,owner_key,password_hash,recovery_hash,created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(id,username,data.username.trim(),owner,passwordHash,digest(recoveryCode),Date.now()).run();
  if(!inserted.meta.changes)throw new ApiError(409,'That username or existing library is already connected to an account. Please sign in.');
  return session(req,{id,owner_key:owner,display_name:data.username.trim(),password_hash:passwordHash,recovery_hash:digest(recoveryCode)},recoveryCode);
 }
 if(action==='recover'){
  const code=typeof data.recoveryCode==='string'?data.recoveryCode.trim():'';
  if(!existing||!/^[a-f0-9]{64}$/.test(code)||digest(code)!==existing.recovery_hash)throw new ApiError(401,'Username or recovery key is incorrect.');
  const replacement=token(),hash=await hashPassword(password);
  const result=await db().batch([db().prepare('UPDATE accounts SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?').bind(hash,digest(replacement),existing.id,existing.recovery_hash),db().prepare('DELETE FROM account_sessions WHERE account_id=?').bind(existing.id)]);
  if(!result[0].meta.changes)throw new ApiError(401,'This recovery key has already been used.');
  return session(req,existing,replacement);
 }
 // Do the same expensive work for an unknown username to reduce enumeration by timing.
 const valid=existing?await verifyPassword(password,existing.password_hash):(await hashPassword(password),false);
 if(!existing||!valid)throw new ApiError(401,'Username or password is incorrect.');
 return session(req,existing);
})}
