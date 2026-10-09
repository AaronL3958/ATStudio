import {defaults,type Settings} from './visualizer';
import {validateSettings} from './settings-validation';
const projectOnly=new Set(['sourceUrl','text','subtitle','logoText','backgroundZoom','backgroundX','backgroundY','centerZoom','centerX','centerY','resolution','fps']);
export type LookPreset={format:'atstudio-spectrum-preset';version:1;name:string;settings:Partial<Settings>};
export function makePreset(name:string,value:unknown):LookPreset{
 if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw new Error('Use a preset name between 1 and 80 characters.');
 const validated=validateSettings(value),settings:Partial<Settings>={};
 for(const key of Object.keys(defaults) as (keyof Settings)[])if(!projectOnly.has(key)&&!(key==='font'&&(validated.font==='ATStudio Custom'||!Object.hasOwn(value as object,'font'))))Object.assign(settings,{[key]:validated[key]});
 return{format:'atstudio-spectrum-preset',version:1,name:name.trim(),settings};
}
export function parsePreset(value:unknown):LookPreset{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Choose an ATStudio preset JSON file.');
 const v=value as Record<string,unknown>;
 if(v.format!=='atstudio-spectrum-preset'||v.version!==1)throw new Error('This preset format or version is not supported.');
 if(!v.settings||typeof v.settings!=='object'||Array.isArray(v.settings))throw new Error('The preset has no visual settings.');
 const data:Record<string,unknown>={};for(const key of Object.keys(defaults))if(!projectOnly.has(key)&&Object.hasOwn(v.settings,key))data[key]=(v.settings as Record<string,unknown>)[key];
 return makePreset(v.name as string,data);
}
export function applyLook(current:Settings,preset:LookPreset):Settings{return {...current,...parsePreset(preset).settings};}
