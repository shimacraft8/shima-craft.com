import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VIEWPOINTS,planAnimals,unplacedSpecies,onLand,terrainHeight,buildTerrain,buildRiver,buildSea,wrapAngle,yawTo,resolveLegacyTarget} from '../src/museum/model.js';
const species=JSON.parse(fs.readFileSync(new URL('../data/species.json',import.meta.url)));
test('every editorial animal has exactly one finite placement in the continuous landscape',()=>{
 const plan=planAnimals(species);assert.equal(plan.length,species.length);assert.equal(new Set(plan.map(p=>p.id)).size,species.length);
 assert.deepEqual(unplacedSpecies(species),[]);
 for(const p of plan){assert.ok([p.x,p.z,p.size,p.lift,p.az].every(Number.isFinite));assert.ok(p.size>0);assert.ok(VIEWPOINTS[p.spotIndex]);}
});
test('all viewpoints are on dry land and their links resolve',()=>{
 for(const p of VIEWPOINTS){assert.ok(onLand(p.x,p.z),p.id);assert.ok(Number.isFinite(terrainHeight(p.x,p.z)+p.eye));for(const link of p.links)assert.ok(VIEWPOINTS.some(q=>q.id===link));}
});
test('ground, river and sea triangles face upward, with finite vertices and valid indices',()=>{
 for(const data of [buildTerrain(),buildRiver(),buildSea()]){
  assert.ok([...data.positions,...data.colours,...data.uvs].every(Number.isFinite));let positive=0,negative=0;
  for(let i=0;i<data.indices.length;i+=3){const [a,b,c]=[data.indices[i],data.indices[i+1],data.indices[i+2]].map(v=>v*3);assert.ok(Math.max(a,b,c)<data.positions.length);
   const y=(data.positions[b+2]-data.positions[a+2])*(data.positions[c]-data.positions[a])-(data.positions[b]-data.positions[a])*(data.positions[c+2]-data.positions[a+2]);if(y>1e-7)positive++;if(y< -1e-7)negative++;
  }
  assert.ok(positive>0);assert.equal(negative,0);
 }
});
test('free-look wraps across north using the shortest turn and old animal links still resolve',()=>{
 assert.ok(Math.abs(wrapAngle(359*Math.PI/180)-(-Math.PI/180))<1e-10);
 assert.ok(Math.abs(yawTo(0,0,1,0)-Math.PI/2)<1e-10);
 for(const s of species){const r=resolveLegacyTarget(new URLSearchParams({exhibit:s.id}),species);assert.equal(r.species.id,s.id);assert.equal(r.open,true);}
});
