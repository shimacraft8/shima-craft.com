import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {walk,voxelHeight,surfaceAt,canStand,PATHS,STEP,CELL,WALK_BOUNDS,buildVoxelTerrain,inputFromKeys} from '../src/museum/voxel-model.js';
import {VIEWPOINTS,planAnimals} from '../src/museum/model.js';
const species=JSON.parse(fs.readFileSync(new URL('../data/species.json',import.meta.url)));
test('green snake is on the forest floor rather than a branch',()=>{
 const s=planAnimals(species).find(p=>p.id==='green-snake');assert.equal(s.perch,'ground');assert.equal(s.lift,0);
});
test('the connecting walk reaches every viewpoint in both directions without teleporting',()=>{
 for(const {a,b} of PATHS)for(const [start,end] of [[a,b],[b,a]]){
  let p={x:start.x,z:start.z},maxY=0,n=0;
  while(Math.hypot(p.x-end.x,p.z-end.z)>.3&&n++<1500){
   const before=voxelHeight(p.x,p.z),yaw=Math.atan2(end.x-p.x,p.z-end.z),next=walk(p,{forward:1,right:0},yaw,.05);
   maxY=Math.max(maxY,Math.abs(next.height-before));assert.ok(next.moved,`${start.id} -> ${end.id} blocked at ${JSON.stringify(p)}`);p=next;
  }
  assert.ok(n<1500,`${start.id} -> ${end.id}`);assert.ok(maxY<=STEP+.001);
 }
});
test('walking is frame-rate independent, diagonal speed is normalized and long frame deltas are bounded',()=>{
 const p=VIEWPOINTS[0],a=walk(p,{forward:1,right:0},0,.1),b=walk(p,{forward:1,right:1},0,.1);
 assert.ok(Math.abs(Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))<.00001);
 let small={x:p.x,z:p.z};for(let i=0;i<5;i++)small=walk(small,{forward:1,right:0},0,.02);
 assert.ok(Math.hypot(a.x-small.x,a.z-small.z)<1e-8);
 assert.deepEqual(walk(p,{forward:1,right:0},0,12),a);
 assert.equal(walk(p,{forward:0,right:0},0,.1).moved,false);
});
test('solid trunks block walking, separated axes permit sliding and cannot be tunnelled through',()=>{
 const p=VIEWPOINTS[0],h=voxelHeight(p.x,p.z),obstacle={x:p.x,z:p.z-.45,hx:.35,hz:.05,bottom:h,top:h+10};
 let q={x:p.x,z:p.z};for(let i=0;i<30;i++)q=walk(q,{forward:1,right:0,fast:true},0,.1,[obstacle]);
 assert.ok(q.z>=obstacle.z+.05+.24-.001);
 const side=walk(q,{forward:1,right:1},0,.1,[obstacle]);assert.ok(side.x>q.x);assert.ok(side.z>=obstacle.z+.05+.24-.001);
});
test('water, steep drops and world edges remain impassable',()=>{
 let water=0,drop=0;
 for(let x=-48;x<52;x+=CELL)for(let z=-40;z<66;z+=CELL){const s=surfaceAt(x,z);if(!s.dry){water++;assert.equal(canStand(x,z,s.height),false);}if(s.dry){drop++;assert.equal(canStand(x,z,s.height+STEP+.1),false);}}
 assert.ok(water>50);assert.ok(drop>100);const b=WALK_BOUNDS;
 assert.equal(canStand(b.maxX+1,22,voxelHeight(b.maxX+1,22)),false);
 assert.equal(canStand(16,b.minZ-1,voxelHeight(16,b.minZ-1)),false);
});
test('block terrain has finite data and outward facing unit normals on every triangle',()=>{
 const g=buildVoxelTerrain({minX:-25,maxX:35,minZ:-35,maxZ:45});assert.ok(g.positions.length>10000);assert.equal(g.positions.length,g.normals.length);assert.equal(g.positions.length,g.colours.length);
 for(let i=0;i<g.positions.length;i+=9){const p=g.positions,a=[p[i+3]-p[i],p[i+4]-p[i+1],p[i+5]-p[i+2]],b=[p[i+6]-p[i],p[i+7]-p[i+1],p[i+8]-p[i+2]],cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  assert.ok(cross.reduce((sum,v,k)=>sum+v*g.normals[i+k],0)>0);assert.equal(Math.hypot(...g.normals.slice(i,i+3)),1);
 }
 assert.ok([...g.positions,...g.colours].every(Number.isFinite));
});
test('opposing keys cancel and physical key codes work regardless of keyboard letter case',()=>{
 assert.deepEqual(inputFromKeys(new Set(['KeyW','KeyS','KeyA','KeyD'])),{forward:0,right:0,fast:false});
 assert.deepEqual(inputFromKeys(new Set(['KeyW','KeyD','ShiftLeft'])),{forward:1,right:1,fast:true});
});

test('the rendered forest obstacles still allow all seven habitats and every animal to be approached',async()=>{
 const THREE=await import('three'),{LivingForest}=await import('../src/museum/forest.js');
 const animals=planAnimals(species),forest=new LivingForest(new THREE.Group(),{mobile:true,placements:animals});
 try{
  const step=CELL/2,start=VIEWPOINTS[0],key=(x,z)=>`${x},${z}`,queue=[[Math.round(start.x/step),Math.round(start.z/step)]],seen=new Set([key(...queue[0])]);
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i],h=voxelHeight(x*step,z*step);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(seen.has(k)||!canStand(nx*step,nz*step,h,forest.obstacles))continue;queue.push([nx,nz]);seen.add(k);}}
  for(const p of VIEWPOINTS)assert.ok(queue.some(([x,z])=>Math.hypot(x*step-p.x,z*step-p.z)<1.2),p.id);
  for(const p of animals)assert.ok(queue.some(([x,z])=>Math.hypot(x*step-p.x,z*step-p.z)<(p.perch==='sea'?22:2.5)),p.id);
  const snake=animals.find(p=>p.id==='green-snake');assert.ok(Math.abs(snake.y-voxelHeight(snake.x,snake.z))<.05);
 }finally{forest.dispose();}
});

test('all rendered and playable cells fit inside the bounded cache and repeated queries reuse cells',async()=>{
 const {terrainCacheStats}=await import('../src/museum/voxel-model.js');
 buildVoxelTerrain();for(let x=-52;x<59;x+=.5)for(let z=-44;z<69;z+=.5)surfaceAt(x,z);
 const before=terrainCacheStats();for(let x=-52;x<59;x+=.5)for(let z=-44;z<69;z+=.5)surfaceAt(x,z);
 const after=terrainCacheStats();assert.ok(before.cells<before.limit);assert.equal(after.cells,before.cells);assert.equal(surfaceAt(-.2,-.2),surfaceAt(-.6,-.6));assert.notEqual(surfaceAt(-.2,-.2),surfaceAt(.2,.2));
});


test('marine turtles swim below sea level over the lagoon rather than standing on the beach',()=>{
 const plans=planAnimals(species);for(const id of ['green-turtle','loggerhead-turtle']){const p=plans.find(p=>p.id===id);assert.equal(p.perch,'sea');assert.ok(p.lift<-.8);
  for(const dx of [-.5,0,.5])for(const dz of [-.3,0,.3]){const s=surfaceAt(p.x+dx,p.z+dz);assert.ok(s.height<p.lift-.1,`${id}: ${s.height}`);assert.equal(s.dry,false);}
 }
});
test('forest and cave animals are not assigned to bare beach or mudflat perches',()=>{
 const plans=planAnimals(species),byId=id=>plans.find(p=>p.id===id);assert.equal(byId('banded-gecko').perch,'ground');assert.equal(byId('long-haired-rat').perch,'branch');assert.equal(byId('orii-bat').perch,'cave-air');assert.equal(byId('ferrie-longhorn').perch,'deadwood');
 for(const id of ['camponotus-amamianus','winter-chafer','pale-thrush','white-striped-chafer','watase-shrew'])assert.ok(['floor','hego','cape'].includes(byId(id).spot));
 assert.deepEqual(byId('banded-gecko').islands,['徳之島']);assert.deepEqual(byId('uke-stag').islands,['請島']);
});
test('solid cave walls occlude labels and species finder chooses the open side',async()=>{
 const {clearSight,observationPoint}=await import('../src/museum/voxel-model.js');const p=VIEWPOINTS[0],y=voxelHeight(p.x,p.z),wall={x:p.x,z:p.z-2,hx:2,hz:.3,bottom:y,top:y+5};const from={x:p.x,z:p.z,y:y+1.62},target={x:p.x,z:p.z-4,y:y+1};assert.equal(clearSight(from,target,[wall]),false);assert.equal(clearSight(from,target,[]),true);const alt=observationPoint(from,target,[wall]);assert.ok(clearSight(alt,target,[wall]));
});
