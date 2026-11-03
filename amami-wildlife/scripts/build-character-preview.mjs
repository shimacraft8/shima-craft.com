import {build} from 'esbuild';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'.preview-characters');fs.mkdirSync(out,{recursive:true});
await build({entryPoints:[path.join(root,'prototypes/characters/entry.js')],outfile:path.join(out,'preview.js'),bundle:true,format:'esm',target:['es2022'],minify:true,legalComments:'linked'});
fs.copyFileSync(path.join(root,'prototypes/characters/index.html'),path.join(out,'index.html'));fs.appendFileSync(path.join(out,'preview.js.LEGAL.txt'),'\n'+fs.readFileSync(path.join(root,'node_modules/three/LICENSE'),'utf8'));
console.log('Character preview built in .preview-characters (not a public website asset).');
await build({entryPoints:[path.join(root,'prototypes/characters/gallery.js')],outfile:path.join(out,'gallery.js'),bundle:true,format:'esm',target:['es2022'],minify:true,legalComments:'linked',define:{SPECIES_DATA:fs.readFileSync(path.join(root,'data/species.json'),'utf8')}});
fs.copyFileSync(path.join(root,'prototypes/characters/gallery.html'),path.join(out,'gallery.html'));
