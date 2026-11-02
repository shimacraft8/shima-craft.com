import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
fs.rmSync(path.join(root,'public/wildlife/assets/museum'),{recursive:true,force:true});
const result=await build({entryPoints:[path.join(root,'src/museum/index.js')],outdir:path.join(root,'public/wildlife/assets/museum'),entryNames:'index',chunkNames:'[name]-[hash]',bundle:true,splitting:true,format:'esm',target:['es2022'],minify:true,legalComments:'linked',metafile:true});
for(const file of Object.keys(result.metafile.outputs)){if(file.endsWith('.LEGAL.txt'))fs.appendFileSync(file,'\n'+fs.readFileSync(path.join(root,'node_modules/three/LICENSE'),'utf8'));}
fs.mkdirSync(path.join(root,'docs'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/museum-bundle.json'),JSON.stringify(Object.fromEntries(Object.entries(result.metafile.outputs).map(([p,v])=>[path.relative(root,p),{bytes:fs.statSync(p).size,entryPoint:v.entryPoint??null}])),null,2)+'\n');
