import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/factory-presets.ts','app/visualizer.ts','app/settings-validation.ts'],outdir:'.sites-runtime/factory-tests',bundle:true,platform:'node',format:'esm'});
const {factoryPresets,applyFactoryPreset}=await import('../.sites-runtime/factory-tests/factory-presets.js');
const {defaults}=await import('../.sites-runtime/factory-tests/visualizer.js');
const {validateSettings}=await import('../.sites-runtime/factory-tests/settings-validation.js');
const current={...defaults,text:'My song',subtitle:'My artist',logoText:'XY',font:'ATStudio Custom',fontSize:45,textColor:'#abcdef',textX:33,textY:91,backgroundZoom:2,backgroundX:35,backgroundY:71,centerZoom:3,centerX:28,centerY:66,resolution:1440,fps:60};
const preserved=['text','subtitle','logoText','font','fontSize','textColor','textX','textY','backgroundZoom','backgroundX','backgroundY','centerZoom','centerX','centerY','resolution','fps'];
assert.equal(factoryPresets.length,9);
assert.equal(new Set(factoryPresets.map(p=>p.id)).size,9);
assert.equal(new Set(factoryPresets.map(p=>p.settings.style)).size,6);
for(const preset of factoryPresets){
 const result=applyFactoryPreset(current,preset);
 assert.deepEqual(validateSettings(result),result);
 for(const key of preserved)assert.equal(result[key],current[key],`${preset.name} changed ${key}`);
 for(const previous of factoryPresets)assert.deepEqual(applyFactoryPreset(applyFactoryPreset(current,previous),preset),result,`${previous.name} leaked settings into ${preset.name}`);
 assert.equal(result.mids,0);assert.equal(result.treble,0);
}
assert.equal(current.text,'My song');
console.log('PASS: nine valid looks, all six spectrum shapes, preserved project content, and deterministic switching between every preset pair.');
