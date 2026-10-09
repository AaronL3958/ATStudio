export const pitches=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const qualities:Record<string,number[]>={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],sus2:[0,2,7],sus4:[0,5,7],dim:[0,3,6],aug:[0,4,8]};
export const chordNames=['N',...pitches.flatMap(p=>['','m','7','maj7','m7','sus2','sus4','dim','aug'].map(q=>p+q))];
export type Chord={start:number;end:number;name:string;strength:number;edited?:boolean};
export type PianoNote={pitch:number;start:number;duration:number;velocity:number;hand:'left'|'right'};
export type Lesson={version:1;duration:number;bpm:number;key:string;offset:number;meter:3|4|6;chords:Chord[];notes:PianoNote[];pianoStatus:'none'|'draft';split:number;capo:number;video:string;videoOffset:number};
export const emptyLesson=(duration:number):Lesson=>({version:1,duration,bpm:120,key:'Unknown',offset:0,meter:4,chords:[],notes:[],pianoStatus:'none',split:60,capo:0,video:'',videoOffset:0});
export function parseLesson(value:unknown):Lesson{
 const x=value as Lesson,finite=(n:number)=>typeof n==='number'&&Number.isFinite(n);
 if(!x||x.version!==1||!finite(x.duration)||x.duration<=0||x.duration>601||!finite(x.bpm)||x.bpm<30||x.bpm>260||!finite(x.offset)||Math.abs(x.offset)>30||![3,4,6].includes(x.meter)||!Number.isInteger(x.split)||x.split<36||x.split>84||!Number.isInteger(x.capo)||x.capo<0||x.capo>11||typeof x.key!=='string'||x.key.length>40||typeof x.video!=='string'||x.video.length>300||!finite(x.videoOffset)||Math.abs(x.videoOffset)>300||!['none','draft'].includes(x.pianoStatus)||!Array.isArray(x.chords)||x.chords.length>10000||!Array.isArray(x.notes)||x.notes.length>100000)throw new Error('This saved lesson is invalid.');
 for(const c of x.chords)if(!finite(c.start)||!finite(c.end)||c.start<0||c.end<=c.start||c.end>x.duration+.1||!chordNames.includes(c.name)||!finite(c.strength)||c.strength<0||c.strength>1)throw new Error('Invalid saved chord chart.');
 for(const n of x.notes)if(!Number.isInteger(n.pitch)||n.pitch<21||n.pitch>108||!finite(n.start)||n.start<0||!finite(n.duration)||n.duration<=0||n.start+n.duration>x.duration+.1||!finite(n.velocity)||n.velocity<0||n.velocity>1||!['left','right'].includes(n.hand))throw new Error('Invalid saved piano notes.');
 return {...x,chords:x.chords.slice().sort((a,b)=>a.start-b.start),notes:x.notes.slice().sort((a,b)=>a.start-b.start)};
}
export const noteName=(midi:number)=>pitches[midi%12]+(Math.floor(midi/12)-1);
export function chordParts(name:string){const match=/^([A-G]#?)(.*)$/.exec(name);return match?{root:pitches.indexOf(match[1]),quality:match[2]}:null}
export function youtubeId(value:string){try{const u=new URL(value),host=u.hostname.replace(/^www\./,'');const id=host==='youtu.be'?u.pathname.slice(1):['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)?u.searchParams.get('v')||/^\/(?:embed|shorts)\/([^/]+)/.exec(u.pathname)?.[1]:null;return /^[-\w]{11}$/.test(id||'')?id:null}catch{return null}}
export function guitarShape(name:string,capo=0):number[]|null{
 const p=chordParts(name);if(!p)return null;const root=(p.root-capo+12)%12,key=pitches[root]+p.quality;
 const open:Record<string,number[]>={C:[-1,3,2,0,1,0],D:[-1,-1,0,2,3,2],E:[0,2,2,1,0,0],G:[3,2,0,0,0,3],A:[-1,0,2,2,2,0],Am:[-1,0,2,2,1,0],Dm:[-1,-1,0,2,3,1],Em:[0,2,2,0,0,0],C7:[-1,3,2,3,1,0],D7:[-1,-1,0,2,1,2],E7:[0,2,0,1,0,0],G7:[3,2,0,0,0,1],A7:[-1,0,2,0,2,0],Am7:[-1,0,2,0,1,0],Em7:[0,2,0,0,0,0],Dm7:[-1,-1,0,2,1,1],Cmaj7:[-1,3,2,0,0,0],Amaj7:[-1,0,2,1,2,0],Dmaj7:[-1,-1,0,2,2,2],Asus2:[-1,0,2,2,0,0],Asus4:[-1,0,2,2,3,0],Dsus2:[-1,-1,0,2,3,0],Dsus4:[-1,-1,0,2,3,3]};
 if(open[key])return open[key];
 // Closed, movable voicings rooted on A. Fret numbers are relative to the capo.
 const forms:Record<string,number[]>={'':[-1,0,2,2,2,0],m:[-1,0,2,2,1,0],'7':[-1,0,2,0,2,0],maj7:[-1,0,2,1,2,0],m7:[-1,0,2,0,1,0],sus2:[-1,0,2,2,0,0],sus4:[-1,0,2,2,3,0],dim:[-1,0,1,2,1,-1],aug:[-1,0,3,2,2,-1]};
 const fret=(root-9+12)%12,eFret=(root-4+12)%12,eForms:Record<string,number[]>={'':[0,2,2,1,0,0],m:[0,2,2,0,0,0],'7':[0,2,0,1,0,0],maj7:[0,2,1,1,0,0],m7:[0,2,0,0,0,0],sus4:[0,2,2,2,0,0],dim:[0,1,2,0,-1,-1],aug:[0,3,2,1,1,0]};if(eFret<fret&&eForms[p.quality])return eForms[p.quality].map(n=>n<0?-1:n+eFret);return forms[p.quality]?.map(n=>n<0?-1:n+fret)||null;
}
export function wav(buffer:AudioBuffer){const n=buffer.length,channels=buffer.numberOfChannels,ab=new ArrayBuffer(44+n*channels*2),v=new DataView(ab),str=(s:string,o:number)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};str('RIFF',0);v.setUint32(4,36+n*channels*2,true);str('WAVEfmt ',8);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str('data',36);v.setUint32(40,n*channels*2,true);for(let c=0;c<channels;c++){const samples=buffer.getChannelData(c);for(let i=0;i<n;i++)v.setInt16(44+(i*channels+c)*2,Math.max(-1,Math.min(1,samples[i]))*32767,true)}return new Blob([ab],{type:'audio/wav'})}
export function downloadFile(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
