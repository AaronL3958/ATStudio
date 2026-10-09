import {ApiError,db,handle} from '../../../common';
import {streamMedia} from '../../../gallery/common';
export async function GET(req:Request,ctx:{params:Promise<{token:string;file:string}>}){return handle(async()=>{
 const {token,file}=await ctx.params;
 if(!['video.mp4','cover.jpg'].includes(file))throw new ApiError(404,'Video unavailable.');
 const row=await db().prepare('SELECT video_key,cover_key FROM gallery_posts WHERE video_token=? AND published=1 AND video_key IS NOT NULL').bind(token).first<{video_key:string;cover_key:string}>();
 if(!row)throw new ApiError(404,'This video is private or has been removed.');
 return streamMedia(req,file==='video.mp4'?row.video_key:row.cover_key,file==='video.mp4'?'video/mp4':'image/jpeg');
})}
export const HEAD=GET;
