import {build} from 'esbuild';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public/wildlife/assets/storybook');fs.mkdirSync(out,{recursive:true});
// Old WebGL bundles are deliberately absent from the new public release. Archive sources remain.
fs.rmSync(path.join(root,'public/wildlife/assets/museum'),{recursive:true,force:true});
const result=await build({entryPoints:[path.join(root,'src/storybook/index.js')],outfile:path.join(out,'index.js'),bundle:true,format:'esm',target:['es2022'],minify:true,legalComments:'none',metafile:true});
fs.writeFileSync(path.join(root,'docs/storybook-bundle.json'),JSON.stringify(Object.fromEntries(Object.entries(result.metafile.outputs).map(([p,v])=>[path.relative(root,p),{bytes:fs.statSync(p).size,entryPoint:v.entryPoint??null}])),null,2)+'\n');
