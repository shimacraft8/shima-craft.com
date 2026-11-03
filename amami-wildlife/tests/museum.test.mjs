import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {roomsFromSpecies,exhibitionPage,clampPage,easeCamera,safeRoom,PAGE_SIZE} from '../src/museum/model.js';
const root=path.resolve(import.meta.dirname,'..');
const species=JSON.parse(fs.readFileSync(path.join(root,'data/species.json')));
const rooms=roomsFromSpecies(species);
test('all editorial records are reachable in exactly one dynamically generated museum room',()=>{
 assert.equal(rooms.length,new Set(species.map(s=>s.group)).size);
 const all=rooms.flatMap(room=>room.entries);
 assert.deepEqual(all.map(s=>s.id).sort(),species.map(s=>s.id).sort());
 for(const room of rooms){assert.ok(room.entries.every(s=>s.group===room.group));assert.equal(new Set(room.entries.map(s=>s.id)).size,room.entries.length);}
 const extra={...species[0],id:'future-entry',group:'将来の分類'};
 assert.equal(roomsFromSpecies([...species,extra]).at(-1).entries[0].id,extra.id);
});
test('exhibit pagination includes the final partial page without missing or duplicate records',()=>{
 for(const room of rooms){const visible=[];for(let p=0;p<Math.ceil(room.entries.length/PAGE_SIZE);p++)visible.push(...exhibitionPage(room,p));assert.deepEqual(visible,room.entries);assert.equal(clampPage(room,-1),0);assert.equal(clampPage(room,999),Math.ceil(room.entries.length/PAGE_SIZE)-1);}
});
test('camera easing has stationary endpoints and monotonic progress; invalid URL room is safe',()=>{
 assert.equal(easeCamera(0),0);assert.equal(easeCamera(1),1);
 for(let i=1;i<=100;i++)assert.ok(easeCamera(i/100)>=easeCamera((i-1)/100));
 for(const value of [-1,6,1.5,'abc',null])assert.equal(safeRoom(value,5),0);
 assert.equal(safeRoom('3',5),3);
});
test('museum payload retains source values and local licensed photo provenance',()=>{
 const payload=JSON.parse(fs.readFileSync(path.join(root,'public/wildlife/data/museum.json')));
 assert.deepEqual(payload.species,species);
 const photos=JSON.parse(fs.readFileSync(path.join(root,'data/photos.json')));
 for(const s of species){const p=payload.photos[s.id];assert.equal(p.caption,photos[s.id].caption);assert.equal(p.author,photos[s.id].author);assert.equal(p.licenseUrl,photos[s.id].licenseUrl);assert.equal(p.sourcePage,photos[s.id].sourcePage);assert.ok(p.src.startsWith(photos[s.id].src+'?v='));}
});
test('picturebook runtime is self-hosted, preserves fallback links and never loads Three.js',()=>{
 const entry=fs.readFileSync(path.join(root,'src/storybook/index.js'),'utf8');
 assert.doesNotMatch(entry,/innerHTML|eval\(|document\.write|THREE|WebGLRenderer/);
 const bundle=fs.readFileSync(path.join(root,'public/wildlife/assets/storybook/index.js'),'utf8');assert.ok(Buffer.byteLength(bundle)<20000);assert.doesNotMatch(bundle,/WebGLRenderer|createShader/);
 const html=fs.readFileSync(path.join(root,'public/wildlife/index.html'),'utf8');assert.match(html,/assets\/storybook\/index.js/);assert.doesNotMatch(html,/assets\/museum\/index.js|<canvas/);
 const detail=fs.readFileSync(path.join(root,'public/wildlife/species/amami-rabbit/index.html'),'utf8');assert.doesNotMatch(detail,/storybook\/index.js/);
});
