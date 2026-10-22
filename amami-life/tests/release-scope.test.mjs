import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm,symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { inspectAssets,inspectConfig } from '../scripts/release-scope.mjs';
test('scope gate accepts only the verified account, service and routes',async()=>{
 const config=JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
 inspectConfig(config);
 for(const changed of [{account_id:'another-project'},{name:'another-worker'},{routes:[]},{services:[]},{workers_dev:true},{vars:{ANALYTICS_TRACKING_ENABLED:'true'}}]) assert.throws(()=>inspectConfig({...config,...changed}));
});
test('scope gate rejects stale admin assets and symlinks',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'release-scope-'));
 try {await writeFile(join(directory,'tracker.js'),'dummy');await assert.rejects(inspectAssets(directory),/Unexpected/);await rm(join(directory,'tracker.js'));await symlink('missing',join(directory,'app.js'));await assert.rejects(inspectAssets(directory),/symlink/);}finally{await rm(directory,{recursive:true,force:true});}
});
