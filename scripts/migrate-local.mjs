import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {projectRoot} from './sites-env.mjs';

// Use Wrangler's migration journal so subsequent runs apply only new migrations.
const buildConfig=path.join(projectRoot,'dist/server/wrangler.json');
let config;
try{config=JSON.parse(readFileSync(buildConfig,'utf8'))}catch{throw new Error('Run npm run build before initializing the local database.')}
const directory=path.join(projectRoot,'.sites-runtime');
mkdirSync(directory,{recursive:true});
const migrationConfig=path.join(directory,'local-migrations.json');
writeFileSync(migrationConfig,JSON.stringify({name:config.name,compatibility_date:config.compatibility_date,d1_databases:config.d1_databases.map(db=>({...db,migrations_dir:path.join(projectRoot,'drizzle')}))}));
const args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--persist-to'))throw new Error('Usage: npm run db:migrate:local -- [--persist-to <local-directory>]');
const state=path.resolve(projectRoot,args[1]||'.wrangler/state');
const result=spawnSync(process.execPath,[path.join(projectRoot,'node_modules/wrangler/bin/wrangler.js'),'d1','migrations','apply','DB','--local','--config',migrationConfig,'--persist-to',state],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
