import {validateSettings} from '../settings-validation';
import {env} from 'cloudflare:workers';
import {getAppUser} from '../account-auth';
import type {Settings} from '../visualizer';
export class ApiError extends Error{constructor(public status:number,message:string){super(message)}}
export async function identity(req:Request){const user=await getAppUser();if(!user)throw new ApiError(401,'Sign in to access your projects.');if(!['GET','HEAD'].includes(req.method)){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new ApiError(403,'This request came from another website.');}return user.userId;}
export function db(){if(!env.DB)throw new ApiError(503,'Project storage is temporarily unavailable. Please retry.');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new ApiError(503,'File storage is temporarily unavailable. Please retry.');return env.BUCKET;}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function handle(fn:()=>Promise<Response>){try{return await fn()}catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);console.error('ATStudio API',e);return json({error:'Could not complete this request. Your current edits are still here. Please retry.'},500)}}
export async function body(req:Request){const value=await req.text();if(value.length>40000)throw new ApiError(413,'Project settings are too large.');try{return JSON.parse(value)}catch{throw new ApiError(400,'Invalid project data.')}}
export function settings(value:unknown):Settings{try{return validateSettings(value)}catch(e){throw new ApiError(400,(e as Error).message)}}
export function projectName(v:unknown){if(typeof v!=='string'||!v.trim()||v.length>100)throw new ApiError(400,'Use a project name between 1 and 100 characters.');return v.trim();}
export function unpack(row:Record<string,unknown>){return {...row,settings:JSON.parse(row.settings as string),assets:JSON.parse(row.assets as string)}}
