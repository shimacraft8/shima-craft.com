import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createVoxelAnimal} from '../src/museum/voxel-animals.js';
test('prototype models have actual volumetric finite geometry from every view and no image textures',()=>{
 for(const id of ['amami-rabbit','green-turtle']){const model=createVoxelAnimal(id);try{
  const box=new THREE.Box3().setFromObject(model.group),size=box.getSize(new THREE.Vector3());assert.ok(size.x>.4&&size.y>.3&&size.z>.8);
  for(const mesh of model.meshes){assert.equal(mesh.material.map,null);assert.ok(mesh.isInstancedMesh);assert.ok(mesh.count>0);const m=new THREE.Matrix4(),v=new THREE.Vector3();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);assert.ok(m.elements.every(Number.isFinite));v.setFromMatrixScale(m);assert.ok(v.x>0&&v.y>0&&v.z>0);}}
  for(const t of [0,.5,1,8]){model.update(t);model.group.updateMatrixWorld(true);assert.ok(model.group.matrixWorld.elements.every(Number.isFinite));}
 }finally{model.dispose();assert.equal(model.group.children.length,0);}}
 assert.equal(createVoxelAnimal('unimplemented-species'),null);
});
test('turtle has two front and two rear articulated flippers attached to its body, not land legs',()=>{
 const model=createVoxelAnimal('green-turtle');try{
  const limbs=model.group.children.filter(p=>p.isGroup);assert.deepEqual(limbs.map(p=>p.name).sort(),['front-flipper-left','front-flipper-right','rear-flipper-left','rear-flipper-right']);
  const body=model.group.children.find(p=>p.isInstancedMesh),bodyBox=new THREE.Box3().setFromObject(body);
  for(const p of limbs){const bbox=new THREE.Box3().setFromObject(p);assert.ok(bodyBox.intersectsBox(bbox),p.name);}
  const front=limbs.filter(p=>p.name.startsWith('front')).map(p=>new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3()).x);const rear=limbs.filter(p=>p.name.startsWith('rear')).map(p=>new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3()).x);assert.ok(Math.min(...front)>Math.max(...rear));
 }finally{model.dispose();}
});

test('every edited species has a distinct finite native model and anatomy-specific limbs',async()=>{
 const {readFile}=await import('node:fs/promises');const species=JSON.parse(await readFile(new URL('../data/species.json',import.meta.url)));
 const {VOXEL_IDS}=await import('../src/museum/voxel-animals.js');assert.equal(VOXEL_IDS.length,species.length);
 for(const animal of species){const m=createVoxelAnimal(animal.id);assert.ok(m,animal.id);try{
  const size=m.bounds.getSize(new THREE.Vector3());assert.ok([size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>.03),animal.id);
  const matrix=new THREE.Matrix4(),scale=new THREE.Vector3();for(const mesh of m.meshes){assert.equal(mesh.material.map,null);for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));scale.setFromMatrixScale(matrix);assert.ok(scale.x>0&&scale.y>0&&scale.z>0);}}
  const actualLegs=[...m.parts.keys()].filter(k=>/^((fore|hind)-)?leg-/.test(k));
  if(animal.group==='昆虫'){assert.equal(actualLegs.length,6,animal.id);assert.equal(m.counts.antennae,2);for(const limb of m.paths.filter(p=>p.name.startsWith('leg-'))){assert.ok(Math.abs(limb.points[0].x)<=.11);assert.ok(limb.points[0].z<0);}}
  if(['frog','rodent','shrew','newt','gecko','rabbit'].includes(m.kind))assert.equal(actualLegs.length,4,animal.id);
  if(m.kind==='bird'){assert.equal(actualLegs.length,2);assert.equal(m.counts.wings,2);assert.equal(m.counts.tails,1);}
  if(m.kind==='snake'){assert.equal(actualLegs.length,0);assert.equal(m.paths.length,1);assert.equal(m.counts.tails,1);const path=m.paths[0];for(let i=1;i<path.points.length;i++)assert.ok(path.points[i].z>path.points[i-1].z);assert.ok(path.radii.at(-1)<path.radii[0]*.2);}
  // Every chain uses overlapping positive cuboids, including the head-to-tail snake path.
  for(const path of m.paths)for(let i=0;i<path.points.length-1;i++){assert.ok(path.radii[i]>0);assert.ok(Object.values(path.points[i]).every(Number.isFinite));}
  m.update(1);m.group.updateMatrixWorld(true);assert.ok(new THREE.Box3().setFromObject(m.group).min.toArray().every(Number.isFinite));
 }finally{m.dispose();}}
});
test('species-specific marks and turtle structure remain distinguishable',()=>{
 const pairs=[['green-turtle','loggerhead-turtle'],['lidths-jay','amami-woodcock'],['habu','green-snake'],['amami-stag','ferrie-longhorn']];
 for(const [a,b] of pairs){const m=createVoxelAnimal(a),n=createVoxelAnimal(b);try{const signature=v=>JSON.stringify(v.meshes.map(x=>[...x.instanceMatrix.array,...x.instanceColor.array]));assert.notEqual(signature(m),signature(n));}finally{m.dispose();n.dispose();}}
 for(const id of ['green-turtle','loggerhead-turtle']){const m=createVoxelAnimal(id);try{assert.equal(m.counts.legs,0);assert.equal(m.counts.frontFlippers,2);assert.equal(m.counts.rearFlippers,2);assert.equal(m.group.children.filter(x=>x.name.includes('flipper')).length,4);}finally{m.dispose();}}
});
