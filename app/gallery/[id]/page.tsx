import type {Metadata} from 'next';
import {headers} from 'next/headers';
import GalleryView from '../../gallery-view';
import {getAppUser} from '../../account-auth';
import {db} from '../../api/common';
import type {PostRow} from '../../api/gallery/common';
import '../../workspace.css';
import '../../gallery.css';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
async function publicPost(id:string){return db().prepare('SELECT * FROM gallery_posts WHERE id=? AND published=1 AND video_key IS NOT NULL AND video_token IS NOT NULL').bind(id).first<PostRow>()}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const row=await publicPost((await params).id);
 if(!row)return {title:'Community visualizer — ATStudio',robots:{index:false}};
 const h=await headers(),host=h.get('host')||'atstudio.aaronl0904.chatgpt.site',origin=(host.startsWith('localhost')||host.startsWith('127.0.0.1')?'http://':'https://')+host;
 const media=`${origin}/api/public-video/${row.video_token}`,url=`${origin}/gallery/${row.id}?v=${row.video_token}`;
 return {title:`${row.title} — ATStudio`,description:row.description||`A music visualizer by ${row.author}.`,openGraph:{type:'video.other',title:row.title,description:`By ${row.author}${row.description?' · '+row.description:''}`,siteName:'ATStudio',url,images:[{url:media+'/cover.jpg',width:800,height:450}],videos:[{url:media+'/video.mp4',type:'video/mp4',width:1280,height:720}]},twitter:{card:'summary_large_image',title:row.title,images:[media+'/cover.jpg']}};
}
export default async function Page({params}:Props){
 const {id}=await params,user=await getAppUser();
 if(!user){const row=await publicPost(id);if(row)return <div className="app gallery-app"><header className="topbar"><a className="brand" href="/">AT<span>Studio</span></a><a className="button" href="/gallery">Explore the gallery</a></header><main className="gallery-main public-video-page"><a className="gallery-back" href="/gallery">← ATStudio gallery</a><article className="gallery-detail"><div className="gallery-detail-heading"><div><span className="eyebrow">SOUND IN MOTION</span><h1>{row.title}</h1><p>By <strong>{row.author}</strong></p></div></div><video className="public-gallery-video" controls playsInline preload="metadata" poster={`/api/public-video/${row.video_token}/cover.jpg`} src={`/api/public-video/${row.video_token}/video.mp4`}/><div className="gallery-description"><p>{row.description}</p><p className="help">Shared publicly by the creator. Sign in to ATStudio to explore the community and create your own visualizer.</p><a className="button primary" href="/studio">Create with ATStudio</a></div></article></main></div>}
 return <GalleryView id={id} initialUser={user?{name:user.name,email:user.email,kind:user.kind}:null}/>;
}
