import {defaults,type Settings} from './visualizer';

export type FactoryPreset={id:string;name:string;category:string;description:string;settings:Partial<Settings>};
// Every factory look starts from the same visual baseline. Keep project content
// and typography out so switching looks cannot overwrite a user's work.
const preserved=new Set(['sourceUrl','text','subtitle','logoText','font','fontSize','textColor','textX','textY','backgroundZoom','backgroundX','backgroundY','centerZoom','centerX','centerY','resolution','fps']);
const baseline=Object.fromEntries(Object.entries(defaults).filter(([key])=>!preserved.has(key))) as Partial<Settings>;
function look(id:string,name:string,category:string,description:string,settings:Partial<Settings>):FactoryPreset{
 return{id,name,category,description,settings:{...baseline,...settings}};
}

export const factoryPresets:readonly FactoryPreset[]=[
 look('nation','Nation','Festival','Sculpted peaks. Big bass. Smooth movement.',{
  style:'bloom',color:'#fff3df',color2:'#edb77b',background:'#18120e',bass:1.75,amplitude:96,roundness:.96,smoothing:.8,fill:.92,thickness:3,glow:24,pulse:.65,
  circleShake:4,circleDrift:16,circleTilt:1,circleSpeed:.55,particles:48,particleColor:'#ffe1b2',particleSize:3.5,particleSpeed:.45,particleBassSpeed:4,particleBrightness:.85,particleTrail:.3,
 }),
 look('neon','Neon','Nightclub','Electric pillars and vivid trails on every hit.',{
  style:'bars',color:'#ff4fc8',color2:'#52deff',background:'#100b22',bass:1.45,amplitude:92,thickness:5,glow:55,roundness:.75,smoothing:.62,pulse:.6,
  circlePath:'orbit',circleDrift:22,circleShake:3,circleSpeed:.8,particles:58,particleColor:'#8decff',particleBrightness:.95,particleSize:2.75,particleBassSpeed:4.5,particleTrail:.7,bassBlur:true,bassBlurAmount:8,
 }),
 look('monochrome','Monochrome','Minimal','A precise white outline with restrained motion.',{
  style:'fluid',color:'#ffffff',color2:'#b9c2cc',gradient:false,background:'#0c0d10',bass:1.05,amplitude:58,thickness:3,glow:5,roundness:1,smoothing:.88,pulse:.25,
  circleDrift:4,circleSpeed:.35,particles:12,particleColor:'#ffffff',particleBrightness:.45,particleSize:2,particleSpeed:.2,particleBassSpeed:1,particleTrail:.1,introStyle:'fade',outroStyle:'fade',
 }),
 look('aurora','Aurora','Atmospheric','Mint and lavender flowing like liquid light.',{
  style:'ribbon',color:'#8fffe0',color2:'#bd96ff',background:'#0b1b20',bass:1.25,amplitude:76,fill:.25,thickness:3,glow:36,roundness:1,smoothing:.92,pulse:.35,
  circlePath:'float',circleDrift:30,circleSpeed:.3,particles:28,particleColor:'#b6ffec',particleBrightness:.65,particleSize:2.5,particleSpeed:.25,particleBassSpeed:1.75,particleTrail:.55,introStyle:'slide',outroStyle:'slide',introDuration:3,outroDuration:3,
 }),
 look('solar','Solar','Warm & bold','Amber halos that swell with the low end.',{
  style:'halo',color:'#ffd56b',color2:'#ff8048',background:'#201008',bass:1.45,amplitude:72,thickness:3,glow:42,roundness:.9,smoothing:.78,pulse:.75,
  circleDrift:12,circleShake:2,circleSpeed:.55,particles:42,particleColor:'#ffd899',particleBrightness:.9,particleSize:3.5,particleBassSpeed:4.5,particleTrail:.45,
 }),
 look('ember','Ember','High energy','Fiery peaks, drifting sparks, and a harder kick.',{
  style:'bloom',color:'#ff6840',color2:'#ffc36a',background:'#200a09',bass:1.9,amplitude:108,fill:.8,thickness:4,glow:34,roundness:.93,smoothing:.7,pulse:.8,
  circleShake:8,circleDrift:14,circleTilt:2,circleSpeed:.9,particles:70,particleColor:'#ffae6e',particleBrightness:.95,particleSize:3,particleSpeed:.55,particleBassSpeed:5,particleBassGlow:1.1,particleTrail:.5,bassBlur:true,bassBlurAmount:12,
 }),
 look('glacier','Glacier','Clean & cool','Ice-blue contours with a soft, weightless drift.',{
  style:'fluid',color:'#d9faff',color2:'#60aaff',background:'#0a1724',bass:1.25,amplitude:74,thickness:3,glow:22,roundness:1,smoothing:.88,pulse:.4,
  circleDrift:12,circleSpeed:.4,particles:30,particleColor:'#b7eaff',particleBrightness:.7,particleSize:2.5,particleSpeed:.3,particleBassSpeed:2,particleTrail:.25,introStyle:'fade',
 }),
 look('orbit','Orbit','Deep space','Violet rings, an orbiting center, inward stars.',{
  style:'halo',color:'#b48bff',color2:'#76e5ff',background:'#100c24',bass:1.3,amplitude:70,thickness:3,glow:35,roundness:.95,smoothing:.85,pulse:.4,
  circlePath:'orbit',circleDrift:42,circleSpeed:.45,circleTilt:1.5,particles:50,particleDirection:'inward',particleColor:'#d4c4ff',particleBrightness:.8,particleSize:2,particleSpeed:.35,particleBassSpeed:2.75,particleTrail:.6,introStyle:'spin',outroStyle:'spin',introDuration:2.5,outroDuration:2.5,
 }),
 look('afterglow','Afterglow','Downtempo','A mirrored sunset wave with a slower pulse.',{
  style:'line',color:'#ffc19b',color2:'#c393ff',background:'#211325',bass:1.15,amplitude:110,thickness:3,glow:25,roundness:1,smoothing:.92,pulse:0,y:53,
  particles:18,particleDirection:'up',particleColor:'#e9b5dc',particleBrightness:.55,particleSize:2.5,particleSpeed:.2,particleBassSpeed:1.25,particleTrail:.2,introStyle:'fade',outroStyle:'fade',introDuration:3,outroDuration:3,
 }),
];

export function applyFactoryPreset(current:Settings,preset:FactoryPreset):Settings{
 return{...current,...preset.settings};
}
