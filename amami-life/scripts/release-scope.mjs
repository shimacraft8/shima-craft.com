import { readFile, readdir, lstat, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const expectedFiles = new Set(['index.html','privacy.html','core.js','usage.js','app.js','sky-map.js','leaflet.css','style.css','theme-tokens.css','shimacraft.css','apple-refinement.css','shimacraft.js','review-refinement.css','legacy-bridge.js','legacy-bridge.css','legacy-links.js','assets/favicon.svg','assets/social-preview.jpg','assets/paper.svg','assets/shimacraft-logo.png','assets/shimacraft-logo-white.png','assets/shimacraft-logo-white-red.svg','assets/suncalc-LICENSE.txt','assets/leaflet-LICENSE.txt',...['layers.png','layers-2x.png','marker-icon.png','marker-icon-2x.png','marker-shadow.png'].map(n=>'assets/leaflet/'+n)]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function inspectAssets(directory) {
 const entries=[];
 async function walk(dir) { for (const name of await readdir(dir)) {
  const path=resolve(dir,name), stat=await lstat(path), rel=relative(directory,path).replaceAll('\\','/');
  if(stat.isSymbolicLink()) throw Error('Release symlink rejected: '+rel);
  if(stat.isDirectory()) { await walk(path); continue; }
  if(!stat.isFile() || !expectedFiles.has(rel)) throw Error('Unexpected release asset: '+rel);
  const data=await readFile(path); entries.push({path:'public/amami-life/'+rel,bytes:data.length,sha256:hash(data)});
 }}
 await walk(directory);
 if(entries.length!==expectedFiles.size) throw Error('Required release assets missing');
 const html=await readFile(resolve(directory,'index.html'),'utf8');
 if(!html.includes('data-release="public"') || !html.includes('https://shima-craft.com/')) throw Error('Public identity missing');
 if(/\/admin\/|tracker\.js|data-amami-analytics/.test(html)) throw Error('Unpublished management/tracking entry');
 return entries.sort((a,b)=>a.path.localeCompare(b.path));
}
export function inspectConfig(config) {
 if(config.name!=='shima-craft-amami-life' || config.account_id!=='42f69e35f08bb21dca5194467e2f59de') throw Error('Release account or Worker mismatch');
 const patterns=config.routes?.map(r=>r.pattern).sort();
 if(JSON.stringify(patterns)!==JSON.stringify(['shima-craft.com/*','www.shima-craft.com/*']) || config.routes.some(r=>r.zone_id!=='cdfc2875eb9e0bf217159ec8be376373')) throw Error('Release zone or route mismatch');
 if(config.workers_dev!==false || config.preview_urls!==false || config.services?.length!==1 || config.services[0].binding!=='SHIMA_ORIGIN' || config.services[0].service!=='shima-craft-com-production') throw Error('Release service or preview scope mismatch');
 if(Object.keys(config.vars??{}).some(k=>k!=='DEBUG_SOURCES') || config.vars?.DEBUG_SOURCES!=='0') throw Error('Unexpected release variables');
 if(config.assets?.binding!=='ASSETS' || config.assets?.directory!=='dist/public' || config.main!=='worker/index.mjs') throw Error('Release entry mismatch');
}
export async function prepareRelease(root) {
 const config=JSON.parse(await readFile(resolve(root,'wrangler.jsonc'),'utf8')); inspectConfig(config);
 const files=await inspectAssets(resolve(root,'dist/public/amami-life'));
 const result=await build({entryPoints:[resolve(root,'worker/index.mjs')],bundle:true,format:'esm',platform:'browser',target:'es2022',external:['node:*'],write:false,metafile:true});
 for(const path of Object.keys(result.metafile.inputs)) if(/(^|\/)(analytics|admin|apps)(\/|$)|tracker/.test(path)) throw Error('Unpublished module in Worker');
 const worker=result.outputFiles[0].contents;
 const out=resolve(root,'dist/release'); await rm(out,{recursive:true,force:true}); await mkdir(out,{recursive:true});
 await cp(resolve(root,'dist/public'),resolve(out,'public'),{recursive:true}); await writeFile(resolve(out,'worker.mjs'),worker);
 const deploy={...config,main:'worker.mjs',assets:{...config.assets,directory:'public'}};
 await writeFile(resolve(out,'wrangler.json'),JSON.stringify(deploy,null,2)+'\n');
 const metadata={schemaVersion:1,site:'https://shima-craft.com',scope:'homepage-only',version:JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version,published:false,files:[...files,{path:'worker.mjs',bytes:worker.length,sha256:hash(worker)},{path:'wrangler.json',bytes:Buffer.byteLength(JSON.stringify(deploy,null,2)+'\n'),sha256:hash(JSON.stringify(deploy,null,2)+'\n')} ]};
 await writeFile(resolve(out,'RELEASE_MANIFEST.json'),JSON.stringify(metadata,null,2)+'\n');
 console.log('Homepage release scope verified; '+metadata.files.length+' hashed files; no deployment.');
 return metadata;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) await prepareRelease(resolve(import.meta.dirname,'..'));
