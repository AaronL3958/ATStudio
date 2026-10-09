'use client';
import {useEffect,useRef,useState} from 'react';
import {AudioLines,Disc3,Music2,Pause,Play,SlidersHorizontal} from 'lucide-react';
import {defaults,draw,type Analysis,type Settings} from './visualizer';
import './home.css';
import AccountMenu from './account-menu';
import type {PublicUser} from './account-form';
const looks=[{name:'Bloom',style:'bloom',color:'#e5c9a4',color2:'#a8794e'},{name:'Fluid',style:'fluid',color:'#f2dfc6',color2:'#ab7c56'},{name:'Halo',style:'halo',color:'#d7a46b',color2:'#eee0cb'}] as const;
function SpectrumPreview({style,paused}:{style:typeof looks[number];paused:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),clock=useRef(0);
 useEffect(()=>{
  const element=canvas.current;if(!element)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  // Illustrative motion loop, not an analyzed or playing track.
  const frames=Array.from({length:720},(_,f)=>Float32Array.from({length:96},(_,b)=>.12+Math.exp(-((f/60*2)%1)*5)*(.44+.17*Math.sin(b*.18+f*.016))));
  const analysis:Analysis={duration:12,rate:60,wave:[],frames};
  const settings:Settings={...defaults,...style,x:50,y:50,radius:23,amplitude:48,background:'#110e0b',text:'',subtitle:'',logoText:'AT',font:'Space Grotesk',particles:28,particleBrightness:.7,particleSize:2,particleBassSpeed:1.4,circleDrift:12,circleShake:3,circleSpeed:.5,introStyle:'none',outroStyle:'none',glow:12};
  let id=0,last=0,visible=true;
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting});observer.observe(element);
  const frame=(now:number)=>{if(visible&&!document.hidden){if(last&&!paused&&!reduced.matches&&document.documentElement.dataset.reducedMotion!=='true')clock.current+=(now-last)/1000;draw(element,settings,clock.current%12,analysis);}last=now;id=requestAnimationFrame(frame)};
  id=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(id);observer.disconnect()};
 },[style,paused]);
 return <canvas ref={canvas} width={1000} height={900} aria-label={'Animated '+style.name+' spectrum preview'}/>;
}
export default function Home({initialUser}:{initialUser:PublicUser|null}){
 const [user,setUser]=useState(initialUser);
 const root=useRef<HTMLDivElement>(null),[look,setLook]=useState(0),[paused,setPaused]=useState(false);
 useEffect(()=>{
  const element=root.current;if(!element)return;const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});
  element.querySelectorAll('[data-reveal]').forEach(node=>observer.observe(node));element.classList.add('motion-ready');let frame=0;
  const update=()=>{frame=0;const y=window.scrollY;element.style.setProperty('--scroll-shift',media.matches?'0px':Math.min(y*.13,110)+'px');element.style.setProperty('--scroll-progress',String(y/Math.max(1,document.documentElement.scrollHeight-window.innerHeight)))};
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update)};window.addEventListener('scroll',onScroll,{passive:true});media.addEventListener('change',update);update();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',onScroll);media.removeEventListener('change',update)};
 },[]);
 return <div className="at-home" ref={root}>
  <a className="home-skip" href="#home-content">Skip to content</a>
  <header className="home-nav"><a href="/" className="home-brand" aria-label="ATStudio home"><AudioLines size={28}/> AT<span>Studio</span></a><nav aria-label="Main navigation"><a href="#create">Explore</a><a href="/gallery">Gallery</a><a href="/learn">Learn · Beta</a><a className="home-nav-cta" href="/studio">Open studio</a><AccountMenu user={user} onUser={setUser} onSignIn={()=>window.location.assign('/studio#signin')}/></nav></header>
  <main id="home-content"><section className="home-hero">
   <div className="hero-copy"><span className="home-kicker">A SPACE FOR YOUR SOUND</span><h1>Make music.<br/>Make it <em>move.</em></h1><p>Your sound has a look. Find it with bass-reactive visuals, make it yours, and take it to the world.</p><div className="home-actions"><a className="home-button" href="/studio"><SlidersHorizontal size={18}/> Create a visualizer</a><a className="home-text-link" href="/learn">Learn a song · Beta</a></div><div className="hero-details"><span>YOUR TRACK.</span><span>YOUR LOOK.</span><span>YOUR STUDIO.</span></div></div>
   <div className="hero-preview"><div className="preview-label"><span><AudioLines size={15}/> SPECTRUM STUDIO</span><span>MOTION PREVIEW</span></div><div className="hero-canvas"><SpectrumPreview style={looks[look]} paused={paused}/></div><div className="home-preview-controls"><div role="group" aria-label="Preview spectrum style">{looks.map((item,i)=><button key={item.name} aria-pressed={look===i} onClick={()=>setLook(i)}>{item.name}</button>)}</div><button className="home-pause" aria-label={paused?'Resume preview animation':'Pause preview animation'} onClick={()=>setPaused(!paused)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button></div></div>
   <div className="home-scroll-note"><span>01 / SOUND IN MOTION</span><a href="#create">SCROLL TO EXPLORE <span className="scroll-line"/></a></div>
  </section><div className="home-type-band" aria-hidden="true"><span>SOUND INTO SIGHT.</span><span>SOUND INTO SIGHT.</span></div>
  <section className="home-create home-section" id="create"><div className="home-section-heading" data-reveal><span className="home-kicker">01 — CREATE</span><h2>Built around<br/><em>your next drop.</em></h2><p>From the first kick to the final frame. Shape every part of your visualizer while your track plays.</p></div><div className="home-features">
   <article data-reveal><span className="feature-number">01</span><AudioLines size={28}/><h3>Feel the low end.</h3><p>Smooth spectra, floating artwork, and particles that accelerate with the bass. Dial in how every element responds.</p><div className="feature-tags"><span>6 spectrum styles</span><span>Bass-only reaction</span></div></article>
   <article data-reveal><span className="feature-number">02</span><SlidersHorizontal size={28}/><h3>Make it unmistakably you.</h3><p>Frame your artwork, choose your colors, add your own fonts, and bring it all in with an intro. Save your look for the next song.</p><div className="feature-tags"><span>Reusable presets</span><span>Custom artwork</span></div></article>
   <article data-reveal><span className="feature-number">03</span><Disc3 size={28}/><h3>Ready for your release.</h3><p>Preview as you create. Export your finished visualizer as an MP4 with your original audio, up to 1440p and 60 fps.</p><div className="feature-tags"><span>720p / 1080p / 1440p</span><span>MP4 export</span></div></article>
  </div><a className="home-button" href="/studio">Find your sound’s signature</a></section>
  <section className="home-learn home-section" id="learn"><div className="learn-display" data-reveal><span className="home-kicker">THE SAME SONG. A NEW PERSPECTIVE.</span><div className="chord-example" aria-label="Example chord progression: A minor, F, C, G"><span>Am</span><span>F</span><span>C</span><span>G</span></div><div className="home-keyboard" aria-hidden="true">{Array.from({length:14},(_,i)=><span key={i} className={[0,3,7,10].includes(i)?'lit':''}>{[0,1,3,4,5].includes(i%7)&&<i/>}</span>)}</div><div className="learn-display-caption"><span>CHORDS · PIANO · GUITAR</span><span>ILLUSTRATIVE PROGRESSION</span></div></div><div className="learn-copy" data-reveal><span className="home-kicker">02 — LEARN · BETA</span><h2>Don’t just listen.<br/><em>Play along.</em></h2><p>Upload a song and explore its chords, key, and tempo. Follow guitar fingerings or generate a piano transcription, with playback to guide you.</p><p className="home-small">Automatic transcriptions are a starting point. Review and refine notes and chords as you learn.</p><a className="home-button home-button-light" href="/learn"><Music2 size={18}/> Enter learning mode · Beta</a></div></section>
  <section className="home-closing home-section" data-reveal><span className="home-kicker">FROM AN IDEA TO YOUR NEXT RELEASE</span><h2>Give your sound<br/>a place to <em>live.</em></h2><div className="home-actions"><a className="home-button" href="/studio">Open ATStudio</a>{user?<span className="home-small">Signed in as {user.name}</span>:<a className="home-text-link" href="/studio#signin">Sign in / create account</a>}</div><p className="home-small">{user?'Your songs, projects, and presets are ready in your workspace.':'Try the studio freely. Create an account to save projects and presets.'}</p></section></main>
  <footer className="home-footer"><a className="home-brand" href="/">AT<span>Studio</span></a><span>SOUND IN MOTION.</span><nav aria-label="Footer navigation"><a href="/gallery">Gallery</a><a href="/studio">Studio</a><a href="/learn">Learn · Beta</a></nav></footer>
 </div>;
}
