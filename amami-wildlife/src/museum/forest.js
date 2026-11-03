import * as THREE from 'three';
import {VIEWPOINTS,riverCentre,riverEdge,riverSurface,terrainHeight} from './model.js';
import {CELL,RISE,TERRAIN_BOUNDS,surfaceAt,voxelHeight,pathAt,buildVoxelTerrain,WALK_BOUNDS} from './voxel-model.js';

/** Original block-built subtropical valley. Shared cubes, no borrowed game assets. */
export class LivingForest {
 constructor(root,{mobile,placements=[]}){
  Object.assign(this,{root,mobile,disposables:new Set(),instanced:[],occluders:[],obstacles:[],batches:new Map()});
  this.cube=new THREE.BoxGeometry(1,1,1);this.disposables.add(this.cube);
  this.solid=new THREE.MeshLambertMaterial({color:'#ffffff'});this.disposables.add(this.solid);
  this.makeLandscape();this.makeWoodland(placements);this.makeClouds();this.flush();
 }
 seeded(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}
 block(kind,x,y,z,sx,sy,sz,colour){if(!this.batches.has(kind))this.batches.set(kind,[]);this.batches.get(kind).push({x,y,z,sx,sy,sz,colour});}
 support(x,z,hx,hz,bottom,top){this.obstacles.push({x,z,hx,hz,bottom,top});}
 makeLandscape(){
  const m=new THREE.MeshLambertMaterial({vertexColors:true});this.disposables.add(m);this.terrain=[];
  // Terrain chunks can be culled behind the player instead of submitting the entire island.
  for(let x=TERRAIN_BOUNDS.minX;x<TERRAIN_BOUNDS.maxX;x+=40)for(let z=TERRAIN_BOUNDS.minZ;z<TERRAIN_BOUNDS.maxZ;z+=40){
   const data=buildVoxelTerrain({minX:x,maxX:Math.min(x+40,TERRAIN_BOUNDS.maxX),minZ:z,maxZ:Math.min(z+40,TERRAIN_BOUNDS.maxZ)}),g=new THREE.BufferGeometry();
   for(const [name,array] of [['position',data.positions],['color',data.colours],['normal',data.normals]])g.setAttribute(name,new THREE.BufferAttribute(array,3));
   g.computeBoundingSphere();this.disposables.add(g);const mesh=new THREE.Mesh(g,m);this.terrain.push(mesh);this.root.add(mesh);this.occluders.push(mesh);
  }
  // Pixel-like timber paths connect the valley's banks without filling in the river.
  for(let x=TERRAIN_BOUNDS.minX;x<TERRAIN_BOUNDS.maxX;x+=CELL)for(let z=-46;z<72;z+=CELL){
   const s=surfaceAt(x+CELL/2,z+CELL/2);if(!s.path)continue;
   this.block('deck',s.x,s.height-.08,s.z,CELL,.22,CELL,s.bridge?'#a98958':'#b8a16b');
   if(s.bridge&&Math.round(s.z/CELL)%4===0)this.block('wood',s.x,(s.height+s.ground)/2,s.z,.25,s.height-s.ground,.25,'#705a3e');
  }
  this.waterMaterial=new THREE.MeshLambertMaterial({color:'#57bbc0',transparent:false,depthWrite:true});this.disposables.add(this.waterMaterial);
  // The river descends over literal square steps. Every segment's top remains visible.
  // All water slabs share one instanced draw, including the stepped fall.
  for(let z=-46;z<82;z+=CELL){
   const mid=z+CELL/2,y=Math.round(riverSurface(mid)/RISE)*RISE+.025,c=Math.round(riverCentre(mid)/CELL)*CELL,w=Math.max(CELL,Math.round(riverEdge(mid)*2/CELL)*CELL);
   this.block('water',c,y-.14,mid,w,.28,CELL+.03,'#ffffff');
   const upstream=Math.round(riverSurface(mid+CELL)/RISE)*RISE;
   if(upstream-y>.2){this.block('foam',c,y+.035,mid+CELL*.35,w,.05,.18,'#d1f4e9');this.block('water',c,(y+upstream)/2,mid+CELL/2,w,upstream-y,.12,'#ffffff');}
  }
  const seaMaterial=new THREE.MeshLambertMaterial({color:'#399fae',transparent:true,opacity:.66,depthWrite:false});this.disposables.add(seaMaterial);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(2200,2200),seaMaterial);this.disposables.add(sea.geometry);sea.rotation.x=-Math.PI/2;sea.position.set(0,.02,-750);this.root.add(sea);
  for(let i=0;i<25;i++){const x=-80+i*7,z=-60-(i%5)*8;this.block('foam',x,.045,z,3+(i%3)*2,.035,.16,'#bfe4db');}
  // A quiet boundary of low timber rails marks the playable forest, rather than an invisible edge.
  const b=WALK_BOUNDS;
  for(let x=b.minX;x<=b.maxX;x+=3)for(const z of [b.minZ,b.maxZ])this.rail(x,z,true);
  for(let z=b.minZ;z<=b.maxZ;z+=3)for(const x of [b.minX,b.maxX])this.rail(x,z,false);
 }
 rail(x,z,horizontal){const s=surfaceAt(x,z);if(!s.dry)return;this.block('wood',x,s.height+.55,z,.18,1.1,.18,'#8b7953');this.block('wood',x,s.height+.85,z,horizontal?3:.12,.12,horizontal?.12:3,'#aa9565');}
 makeWoodland(placements){
  const random=this.seeded(99172),rng=(a,b)=>a+(b-a)*random();
  const clear=(x,z,r=2.4)=>VIEWPOINTS.every(p=>Math.hypot(x-p.x,z-p.z)>r)&&placements.every(p=>Math.hypot(x-p.x,z-p.z)>1.5)&&pathAt(x,z).distance>2.4;
  const dry=(x,z)=>{const s=surfaceAt(x,z);return s.dry&&!(z<-23&&s.height<3.6);};
  // Broadleaf trees have asymmetrical stair-stepped crowns and square buttress roots.
  for(let i=0;i<220;i++){
   const x=Math.round(rng(-69,76)/CELL)*CELL,z=Math.round(rng(-34,105)/CELL)*CELL;
   if(!dry(x,z)||!clear(x,z,3.4))continue;
   this.tree(x,z,random,i%4===0);
  }
  // HIKAGE-HEGO: slender trunk, radial fronds and paired pinnae, all built with blocks.
  for(const p of VIEWPOINTS){if(p.id==='shore')continue;
   for(let i=0;i<4;i++){const a=i*1.7+.4,r=5+random()*5,x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;if(dry(x,z)&&clear(x,z,2.2))this.fern(x,z,random);}
  }
  for(const [x,z] of [[23.5,14],[23,26]])if(dry(x,z)&&pathAt(x,z).distance>2.4)this.fern(x,z,random);
  // Low ferns, epiphytes, fallen wood and moss make the forest floor readable at eye level.
  for(let i=0;i<(this.mobile?350:600);i++){
   const x=rng(-52,58),z=rng(-28,74);if(!dry(x,z)||!clear(x,z,2))continue;
   const y=voxelHeight(x,z),h=rng(.18,.5),c=i%3?'#5a863b':'#83a74a';
   this.groundcover(x,y,z,h,c);
  }
  for(const p of VIEWPOINTS)for(let i=0;i<45;i++){
   const a=random()*Math.PI*2,r=2+random()*10,x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;
   if(dry(x,z)&&clear(x,z,1.2))this.groundcover(x,voxelHeight(x,z),z,rng(.18,.45),i%3?'#62873d':'#8ba451');
  }
  for(let z=-23;z<40;z+=2.8)for(const side of [-1,1]){
   const x=riverCentre(z)+side*(riverEdge(z)+rng(.3,1.3));if(!clear(x,z,1.2))continue;
   this.rock(x,z,rng(.45,1.1));
  }
  for(const p of placements){
   const s=surfaceAt(p.x,p.z);if(p.perch==='sea'){p.y=p.lift;continue;}p.y=s.height+p.lift+.035;
   if(p.perch==='cave-air'){this.cave(p.x,p.z,s.height);p.z-=.9;continue;}
   if(['deadwood','trunk'].includes(p.perch)){
    const view=VIEWPOINTS.find(v=>v.id===p.spot),dx=view.x-p.x,dz=view.z-p.z;
    p.surfaceNormal=Math.abs(dx)>Math.abs(dz)?{x:Math.sign(dx),z:0}:{x:0,z:Math.sign(dz)};
    const half=p.perch==='deadwood'?.30:.23,cx=p.x-p.surfaceNormal.x*(half+.008),cz=p.z-p.surfaceNormal.z*(half+.008),h=p.perch==='deadwood'?3.2:5.9;
    this.block('wood',cx,s.height+h/2,cz,half*2,h,half*2,p.perch==='deadwood'?'#8b8067':'#705c3e');this.support(cx,cz,half,half,s.height,s.height+h);
    if(p.perch==='trunk')this.block('leaves',cx,s.height+h,cz,2.5,.8,2.3,'#547b3a');continue;
   }
   if(p.perch==='water'||p.perch==='rock')p.y=this.rock(p.x,p.z,p.size*.38+.2);
   if(['branch','canopy'].includes(p.perch)){
    const pr=this.seeded([...p.id].reduce((n,c)=>n+c.charCodeAt(0),0)),base=s.height,h=Math.max(p.lift+1.8,5.8+pr()*.8),width=.32+pr()*.15;
    this.block('wood',p.x+.65,base+h/2,p.z+.16,width,h,width,'#705c3e');
    this.block('wood',p.x+.16,p.y-.07,p.z,.85,.14,.18,'#8e7149');
    this.support(p.x+.65,p.z+.16,width/2,width/2,base,base+h);
    this.block('leaves',p.x+.85,base+h,p.z+.1,2.3+pr(),.8,2.2,'#4a7936');this.block('leaves',p.x+.6,base+h+.7,p.z+.2,1.7,.65,1.6,'#648b3f');
   }else if(p.perch==='leaf'){
    this.block('leaves',p.x,p.y-.08,p.z,.7,.14,.55,'#719343');
    this.block('wood',p.x,s.height+p.lift/2,p.z,.1,p.lift,.1,'#6a8150');
   }
  }
 }
 tree(x,z,random,big=false){
  const y=voxelHeight(x,z),h=(big?10:6)+random()*5,w=big?.85:.42;
  this.block('wood',x,y+h/2,z,w,h,w,'#6b583a');this.support(x,z,w/2,w/2,y,y+h);
  if(big)for(const side of [-1,1]){this.block('wood',x+side*.55,y+.5,z,1.1,1,.22,'#756242');this.block('wood',x,y+.5,z+side*.55,.22,1,1.1,'#756242');}
  const shades=['#426d30','#4f7c36','#618a3f','#73974c'];
  for(let layer=0;layer<3;layer++){
   const span=(big?5:3.6)-layer*.65,c=shades[(layer+Math.floor(random()*2))%shades.length];
   this.block('leaves',x+(random()-.5),y+h+layer*.65,z+(random()-.5),span,.9,span*.85,c);
   for(let side=0;side<3;side++){const a=side*2.1;this.block('leaves',x+Math.sin(a)*span*.45,y+h-.5+layer*.4,z+Math.cos(a)*span*.45,span*.56,.7,span*.56,c);}
  }
  if(big){this.support(x,z,.55,.11,y,y+1);this.support(x,z,.11,.55,y,y+1);}
  this.block('wood',x+.8,y+h*.7,z,1.8,.25,.25,'#705c3e');
 }
 fern(x,z,random){
  const y=voxelHeight(x,z),h=3.6+random()*1.8;
  this.block('wood',x,y+h/2,z,.3,h,.3,'#796548');this.support(x,z,.15,.15,y,y+h);
  for(let ring=0;ring<5;ring++)this.block('wood',x,y+.5+ring*.75,z,.38,.12,.38,'#95805b');
  const count=6+Math.floor(random()*4),phase=random()*Math.PI;
  for(let n=0;n<count;n++){
   const a=phase+n*Math.PI*2/count,dx=Math.sin(a),dz=Math.cos(a),length=2.5+random()*1.3,colour=n%2?'#63953e':'#7ca54b';
   for(let k=1;k<=7;k++){
    const t=k/7,r=t*length,py=y+h+Math.sin(t*Math.PI)*.9-t*t*1.2;
    const px=x+dx*r,pz=z+dz*r,spread=Math.sin(t*Math.PI)*.6;
    this.block('fern',px,py,pz,.24,.15,.24,colour);
    for(const side of [-1,1])this.block('fern',px+dz*spread*side,py-.07,pz-dx*spread*side,.36,.14,.36,colour);
   }
  }
  this.block('fern',x+.12,y+h+.32,z,.16,.65,.16,'#9db763');this.block('fern',x+.25,y+h+.65,z,.28,.17,.16,'#9db763');
 }
 cave(x,z,y){
  for(const side of [-1,1]){const px=x+side*2,bottom=voxelHeight(px,z+.3),height=y+3.6-bottom;this.block('stone',px,bottom+height/2,z+.3,.8,height,3.6,'#858871');this.support(px,z+.3,.4,1.8,bottom,y+3.6);}
  const bottom=voxelHeight(x,z+1.8),height=y+3.6-bottom;this.block('stone',x,bottom+height/2,z+1.8,4.8,height,.7,'#626e59');this.support(x,z+1.8,2.4,.35,bottom,y+3.6);
  this.block('stone',x,y+4,z+.3,4.8,.8,4.3,'#8e9379');this.support(x,z+.3,2.4,2.15,y+3.6,y+4.4);
  this.block('leaves',x-.5,y+4.5,z+.5,3.3,.3,3.3,'#547a38');
 }
 groundcover(x,y,z,h,c){this.block('groundcover',x,y+h/2,z,.22,h,.22,c);this.block('groundcover',x-.25,y+h*.65,z,.38,.13,.2,c);this.block('groundcover',x+.25,y+h*.82,z,.38,.13,.2,c);}
 rock(x,z,size){const y=Math.max(voxelHeight(x,z),riverSurface(z)-.15);this.block('stone',x,y+size*.25,z,size*1.5,size*.5,size,'#7f8a70');this.block('stone',x+.08,y+size*.58,z-.04,size,.22,size*.8,'#98a17e');this.support(x,z,size*.75,size*.5,y,y+size*.69);return y+size*.69+.035;}
 makeClouds(){
  for(let i=0;i<14;i++){const a=i*.46,r=130+Math.sin(i)*25,x=Math.sin(a)*r,z=Math.cos(a)*r;
   this.block('cloud',x,72+(i%4)*5,z,22,3,10,'#eaf1dd');this.block('cloud',x+5,76+(i%4)*5,z,12,5,8,'#eff4e5');
  }
 }
 flush(){const dummy=new THREE.Object3D(),c=new THREE.Color();
  for(const [kind,entries] of this.batches){
   const mesh=new THREE.InstancedMesh(this.cube,kind==='water'?this.waterMaterial:this.solid,entries.length);
   entries.forEach((e,i)=>{dummy.position.set(e.x,e.y,e.z);dummy.scale.set(e.sx,e.sy,e.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,c.set(e.colour));});
   mesh.userData.kind=kind;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();this.root.add(mesh);this.instanced.push(mesh);
   if(['wood','stone','deck'].includes(kind))this.occluders.push(mesh);
  }
  this.batches.clear();
 }
 heightAt(x,z){return voxelHeight(x,z);}
 update(time){for(const m of this.instanced){if(m.userData.kind==='cloud')m.position.x=Math.sin(time*.04)*3;if(m.userData.kind==='foam')m.position.y=Math.sin(time*.8)*.025;}}
 lowerQuality(){for(const m of this.instanced)if(m.userData.kind==='groundcover')m.count=Math.max(1,Math.floor(m.count*.65));}
 dispose(){for(const mesh of this.instanced)mesh.dispose();for(const item of this.disposables)item.dispose?.();this.root.clear();}
}
