export type TrackSource={provider:'youtube'|'spotify';id:string;url:string;embed:string};
export function parseSource(value:string):TrackSource|null{
 try{const u=new URL(value.trim());if(u.protocol!=='https:'||u.username||u.password||u.port)return null;const host=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);let id='';
  if(host==='youtu.be')id=parts[0]||'';
  else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v')||'':['embed','shorts','live'].includes(parts[0])?parts[1]||'':'';
  if(/^[\w-]{11}$/.test(id))return{provider:'youtube',id,url:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube-nocookie.com/embed/'+id};
  if(host==='open.spotify.com'){if(/^intl-[a-z-]+$/i.test(parts[0]))parts.shift();if(parts[0]==='track'&&parts.length===2&&/^[a-zA-Z0-9]{22}$/.test(parts[1]))return{provider:'spotify',id:parts[1],url:'https://open.spotify.com/track/'+parts[1],embed:'https://open.spotify.com/embed/track/'+parts[1]};}
 }catch{}return null;
}
