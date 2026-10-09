import {chordParts,qualities,type Chord,type PianoNote} from './music';
// Track one continuous right-hand melody. The left hand is built separately
// from the editable harmonic chart, never from full-mix pitch candidates.
export function arrangePiano(candidates:PianoNote[],duration:number,bpm:number,melodyFloor=55):PianoNote[]{
 const step=.04,count=Math.ceil(duration/step),output:PianoNote[]=[];
 const byPitch=new Map<number,PianoNote[]>();for(const note of candidates){const list=byPitch.get(note.pitch)||[];list.push(note);byPitch.set(note.pitch,list)}
 for(const hand of ['right'] as const){
  const low=melodyFloor,high=88,size=high-low+2,rest=size-1,activation=Array.from({length:count},()=>new Float32Array(size));
  for(const note of candidates){if(note.pitch<low||note.pitch>high)continue;const a=Math.max(0,Math.round(note.start/step)),b=Math.min(count,Math.round((note.start+note.duration)/step));if(b-a<2)continue;for(let f=a;f<b;f++)activation[f][note.pitch-low]=Math.max(activation[f][note.pitch-low],note.velocity*(f-a<3?1.12:1));}
  let prev=new Float32Array(size);const back:Uint8Array[]=[],path=new Uint8Array(count);
  for(let f=0;f<count;f++){const row=activation[f],peak=Math.max(...row),next=new Float32Array(size),pointers=new Uint8Array(size);for(let j=0;j<size;j++){let best=-Infinity,from=rest;for(let k=0;k<size;k++){const jump=j===k?0:j===rest||k===rest?.2:.22+Math.min(18,Math.abs(j-k))*.035,value=prev[k]-jump;if(value>best){best=value;from=k}}const pitch=low+j,emission=j===rest?(peak<.2?.12:-.12):row[j]>.05?row[j]-.16-Math.abs(pitch-69)*.0015:-1.2;next[j]=best+emission;pointers[j]=from}prev=next;back.push(pointers)}
  let state=prev.indexOf(Math.max(...prev));for(let f=count-1;f>=0;f--){path[f]=state;state=back[f][state]}
  const minLength=Math.max(.1,Math.min(.24,60/bpm/4));for(let a=0;a<count;){let b=a+1;while(b<count&&path[b]===path[a])b++;if(path[a]!==rest&&(b-a)*step>=minLength){const pitch=low+path[a];let velocity=0;for(let f=a;f<b;f++)velocity+=activation[f][path[a]];const starts=(byPitch.get(pitch)||[]).filter(n=>n.start>=a*step-.06&&n.start<b*step-.08&&n.velocity>.2).map(n=>n.start).sort((x,y)=>x-y),boundaries=[a*step];for(const onset of starts)if(onset-boundaries[boundaries.length-1]>=minLength)boundaries.push(onset);boundaries.push(Math.min(duration,b*step));for(let i=0;i<boundaries.length-1;i++)if(boundaries[i+1]-boundaries[i]>=minLength)output.push({pitch,start:boundaries[i],duration:boundaries[i+1]-boundaries[i],velocity:Math.max(.1,Math.min(1,velocity/(b-a))),hand})}a=b}
 }
 return output.sort((a,b)=>a.start-b.start||a.pitch-b.pitch);
}
// Close-position inversions keep each chord within one octave and minimize hand travel.
export function chordAccompaniment(chords:Chord[],duration:number,melodyFloor=55,offset=0):PianoNote[]{
 const notes:PianoNote[]=[];let previous:number[]=[];
 for(const chord of chords){const parts=chordParts(chord.name);if(!parts||!qualities[parts.quality]){previous=[];continue}
  const pcs=qualities[parts.quality].map(n=>(n+parts.root)%12),ceiling=Math.max(47,Math.min(60,melodyFloor-1)),choices:number[][]=[];
  for(let bottom=36;bottom<=ceiling;bottom++){if(!pcs.includes(bottom%12))continue;const voice=pcs.map(pc=>bottom+(pc-bottom%12+12)%12).sort((a,b)=>a-b);if(voice[voice.length-1]<=ceiling)choices.push(voice)}
  const cost=(voice:number[])=>previous.length?voice.reduce((sum,n,i)=>sum+Math.abs(n-previous[Math.min(i,previous.length-1)]),0):Math.abs(voice.reduce((a,b)=>a+b,0)/voice.length-47)+(voice[0]%12===parts.root?0:1);
  choices.sort((a,b)=>cost(a)-cost(b));const voice=choices[0];if(!voice)continue;previous=voice;
  const start=Math.max(0,chord.start+offset),end=Math.min(duration,chord.end+offset);if(end-start<.05)continue;
  for(const pitch of voice)notes.push({pitch,start,duration:end-start,velocity:.58,hand:'left'});
 }
 return notes;
}
export function withChordAccompaniment(melody:PianoNote[],chords:Chord[],duration:number,melodyFloor=55,offset=0){return [...melody.filter(n=>n.hand==='right'),...chordAccompaniment(chords,duration,melodyFloor,offset)].sort((a,b)=>a.start-b.start||a.pitch-b.pitch)}
