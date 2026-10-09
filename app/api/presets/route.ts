import {ApiError,body,db,handle,identity,json} from '../common';
import {makePreset} from '../../presets';
export async function GET(req:Request){return handle(async()=>{const owner=await identity(req),rows=await db().prepare('SELECT id,name,settings,updated_at FROM presets WHERE owner=? ORDER BY updated_at DESC').bind(owner).all();return json({presets:rows.results.map(row=>({...row,settings:JSON.parse(row.settings as string)}))})})}
export async function POST(req:Request){return handle(async()=>{
 const owner=await identity(req),data=await body(req);let preset;try{preset=makePreset(data.name,data.settings)}catch(e){throw new ApiError(400,(e as Error).message)}
 const id=crypto.randomUUID(),now=Date.now();
 const inserted=await db().prepare('INSERT INTO presets (id,owner,name,settings,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM presets WHERE owner=?) < 100').bind(id,owner,preset.name,JSON.stringify(preset.settings),now,now,owner).run();
 if(!inserted.meta.changes)throw new ApiError(409,'Your library holds up to 100 presets. Remove one before saving another.');
 return json({preset:{id,name:preset.name,settings:preset.settings,updated_at:now}},201);
})}
