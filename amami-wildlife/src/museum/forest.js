import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {VegetationTools} from './vegetation.js';
import {buildTerrain,buildRiver,buildSea,terrainHeight,riverSurface,riverCentre,riverEdge,onLand,VIEWPOINTS,mix,smoothstep} from './model.js';

/** Original procedural Amami-inspired landscape. One continuous height field, never rooms. */
export class LivingForest extends VegetationTools {
 constructor(root,{mobile,placements=[]}){
  super();Object.assign(this,{root,mobile,budget:mobile?.62:1,disposables:new Set(),instanced:[],layers:[]});
  this.makeTextures();this.makeMaterials();this.makeShapes();
  this.groundMaterial.aoMap=null;this.groundMaterial.map.repeat.set(1,1);
  this.groundMaterial.color.set('#cbd3b7');
  this.leafMaterial.emissiveIntensity=.08;this.rockMaterial.color.set('#ffffff');
  this.makeFrond();this.makeLandscape();this.makeWoodland(placements);this.makeSpray();
 }
 groundPoint(x,z){return new THREE.Vector3(x,terrainHeight(x,z),z);}
 meshSurface(data,material){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
  g.setAttribute('color',new THREE.BufferAttribute(data.colours,3));g.setAttribute('uv',new THREE.BufferAttribute(data.uvs,2));
  g.setIndex(new THREE.BufferAttribute(data.indices,1));g.computeVertexNormals();this.disposables.add(g);
  const mesh=new THREE.Mesh(g,material);this.root.add(mesh);return mesh;
 }
 makeLandscape(){
  this.terrain=this.meshSurface(buildTerrain({rings:this.mobile?132:172,sectors:this.mobile?148:200}),this.groundMaterial);
  const canvas=this.canvas(128,256),x=canvas.getContext('2d'),rnd=this.seeded(58);
  x.fillStyle='#61a7a1';x.fillRect(0,0,128,256);
  for(let i=0;i<160;i++){x.strokeStyle=i%3?'#d5eee430':'#307b8545';x.lineWidth=.5+rnd()*2;x.beginPath();const px=rnd()*128,y=rnd()*256;x.moveTo(px,y);x.bezierCurveTo(px-2,y+10,px+3,y+24,px,y+40);x.stroke();}
  this.flowMap=this.texture(canvas);this.flowMap.wrapS=this.flowMap.wrapT=THREE.RepeatWrapping;
  const water=new THREE.MeshPhongMaterial({map:this.flowMap,vertexColors:true,normalMap:this.rippleMap,normalScale:new THREE.Vector2(.18,.18),shininess:45,specular:'#669fa1'});
  this.disposables.add(water);this.river=this.meshSurface(buildRiver({lanes:9}),water);this.sea=this.meshSurface(buildSea({rings:42,sectors:128}),water);
  this.waterMaterial=water;this.occluders=[this.terrain];
 }
 makeFrond(){
  // One arched, finely pinnate frond. Its silhouette is a fern, not bead-like leaves.
  const positions=[],uvs=[],indices=[],cell=this.cell(0,1),n=14;
  for(let i=0;i<=n;i++){
   const t=i/n;
   for(let side=0;side<2;side++){
    positions.push((side-.5)*1.65,.65*Math.sin(t*Math.PI)-1.4*t*t,t*3.8);
    uvs.push(mix(cell.u0,cell.u1,side),mix(cell.v0,cell.v1,t));
   }
  }
  for(let i=0;i<n;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
  this.shapes.hego=g;this.disposables.add(g);
  const c=this.canvas(128,256),x=c.getContext('2d');x.fillStyle='#5a4935';x.fillRect(0,0,128,256);
  for(let row=0;row<10;row++)for(let col=0;col<3;col++){
   x.strokeStyle='#b5a280';x.lineWidth=2.4;x.beginPath();x.ellipse(col*48+(row%2)*24,row*28,13,8,-.2,0,Math.PI*2);x.stroke();
   x.strokeStyle='#2f3628';x.lineWidth=1;x.stroke();
  }
  this.fernBark=new THREE.MeshLambertMaterial({map:this.texture(c),color:'#c6bba3'});this.disposables.add(this.fernBark);
 }
 treeFern(ctx,x,z,rnd){
  const base=this.groundPoint(x,z),height=3.6+rnd()*3.1;
  const top=base.clone().add(new THREE.Vector3(0,height,0));
  ctx.fernTrunks.push(this.tube([base,top],.19,.12,5,8));
  for(let i=0;i<10;i++)this.leafAt(ctx,'hego',top,{scale:.7+rnd()*.45,rx:(rnd()-.5)*.16,ry:i*Math.PI*2/10,rz:0,shade:.8+rnd()*.32});
  // Coiled new shoots at the crown are small and geometric, not fabricated animal shapes.
  for(let i=0;i<2;i++){const a=rnd()*6.28;ctx.fernTrunks.push(this.tube([top,top.clone().add(new THREE.Vector3(Math.cos(a)*.18,.7,Math.sin(a)*.18)),top.clone().add(new THREE.Vector3(Math.cos(a)*.4,.8,Math.sin(a)*.4))],.035,.018,5,5));}
 }
 addRock(ctx,x,z,size=1){
  const base=this.groundPoint(x,z),g=new THREE.IcosahedronGeometry(size,1);g.scale(1,.62,.85);g.translate(x,base.y+size*.3,z);
  const colour=new THREE.Color('#68785e');const rgb=[];for(let i=0;i<g.attributes.position.count;i++)rgb.push(colour.r,colour.g,colour.b);
  g.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));ctx.rocks.push(g);return base.y+size*.9;
 }
 makeWoodland(placements){
  const rnd=this.seeded(99172),rng=(a,b)=>a+(b-a)*rnd();
  const ctx={trunks:[],fernTrunks:[],rocks:[],batches:Object.fromEntries(Object.keys(this.shapes).map(k=>[k,[]])),anchors:{branch:[],leaf:[]}};
  const away=(x,z,r=3)=>VIEWPOINTS.every(p=>Math.hypot(x-p.x,z-p.z)>r)&&placements.every(p=>Math.hypot(x-p.x,z-p.z)>1.2);
  // Multiple age classes and crowns surround every eye-level viewpoint. No rotating island platform.
  for(let i=0;i<(this.mobile?125:185);i++){
   const x=rng(-64,73),z=rng(-30,95);if(!onLand(x,z)||!away(x,z,3.4))continue;
   if(i%3===0)this.bigTree(ctx,x,z,rnd);else this.slimTree(ctx,x,z,rnd);
  }
  // Near fern silhouettes matter more than raw polygon count.
  for(const spot of VIEWPOINTS){
   if(spot.id==='shore')continue;
   for(let i=0;i<5;i++){
    const a=i*1.32+.4,dist=5.5+rnd()*5,x=spot.x+Math.sin(a)*dist,z=spot.z+Math.cos(a)*dist;
    if(onLand(x,z)&&away(x,z,2.8))this.treeFern(ctx,x,z,rnd);
   }
  }
  for(let i=0;i<(this.mobile?900:1650);i++){
   const spot=VIEWPOINTS[i%VIEWPOINTS.length],a=rnd()*6.28,r=rng(2.6,27),x=spot.x+Math.cos(a)*r,z=spot.z+Math.sin(a)*r;
   if(!onLand(x,z)||!away(x,z,2.1))continue;
   const pos=this.groundPoint(x,z);
   this.leafAt(ctx,i%8===0?'frond':i%5===0?'round':'cover',pos,{scale:rng(.55,1.7),rx:rng(-.1,.15),ry:rnd()*6.28,rz:rng(-.1,.1),shade:rng(.6,1.1)});
  }
  for(let i=0;i<700;i++){
   const spot=VIEWPOINTS[i%VIEWPOINTS.length],a=rnd()*6.28,r=rng(.5,12),x=spot.x+Math.cos(a)*r,z=spot.z+Math.sin(a)*r;
   if(!onLand(x,z))continue;const p=this.groundPoint(x,z);p.y+=.04;
   this.leafAt(ctx,'litter',p,{scale:rng(.5,1.5),rx:-Math.PI/2,ry:rnd()*6.28,rz:0,shade:rng(.5,.8),warm:.6});
  }
  for(let z=-24;z<35;z+=1.7){
   for(const side of [-1,1]){const x=riverCentre(z)+side*(riverEdge(z)+rng(.5,2.5));this.addRock(ctx,x,z,rng(.3,1.3));}
  }
  // A few true buttress planes widen the tree bases; broadleaf epiphytes sit on the trunks.
  for(const p of placements){
   let floor=terrainHeight(p.x,p.z);
   if(p.perch==='rock'||p.perch==='water'){
    floor=Math.max(floor,riverSurface(p.z)-.12);const size=p.size*.65+.3;
    const rock=this.addRock(ctx,p.x,p.z,size);p.y=Math.max(floor,rock);
   }else p.y=floor+p.lift+.035;
   if(['branch','canopy','trunk'].includes(p.perch)){
    const base=this.groundPoint(p.x+.65,p.z+.15),top=base.clone().add(new THREE.Vector3(.35,p.lift+2,0));
    ctx.trunks.push(this.tube([base,base.clone().lerp(top,.55),top],p.perch==='trunk'?.15:.25,.055,6,7));
    const seat=new THREE.Vector3(p.x,p.y,p.z);
    ctx.trunks.push(this.tube([new THREE.Vector3(base.x,seat.y-.18,base.z),seat.clone().add(new THREE.Vector3(-.3,-.04,0))],.08,.035,3,6));
    this.crown(ctx,top,1.2,this.scale(10),rnd,'broad',.9);
   }else if(p.perch==='leaf'){
    const pos=new THREE.Vector3(p.x,p.y-.1,p.z);
    this.leafAt(ctx,'round',pos,{scale:.6,rx:-.9,ry:0,rz:0,shade:1});
    ctx.trunks.push(this.tube([this.groundPoint(p.x,p.z),pos],.025,.015,3,5));
   }
  }
  this.merge(ctx.trunks,this.barkMaterial);this.merge(ctx.fernTrunks,this.fernBark);this.merge(ctx.rocks,this.rockMaterial);
  for(const [kind,entries] of Object.entries(ctx.batches))this.instance(this.shapes[kind],entries);
  // Far hills carry layered solid canopy masses, avoiding thousands of transparent leaves.
  const g=new THREE.IcosahedronGeometry(1,1),m=new THREE.MeshLambertMaterial({color:'#42684b'});this.disposables.add(g);this.disposables.add(m);
  const entries=[];for(let i=0;i<260;i++){
   const a=rnd()*6.28,r=rng(75,210),x=9+Math.sin(a)*r,z=-4+Math.cos(a)*r;
   if(!onLand(x,z)||z<-50)continue;
   const n=new THREE.Object3D();n.position.set(x,terrainHeight(x,z)+6,z);n.scale.set(rng(5,11),rng(4,8),rng(5,11));n.rotation.y=rnd()*6.28;n.updateMatrix();entries.push(n.matrix.clone());
  }
  const hills=new THREE.InstancedMesh(g,m,entries.length);entries.forEach((a,i)=>hills.setMatrixAt(i,a));hills.computeBoundingSphere();this.root.add(hills);this.instanced.push(hills);
 }
 merge(parts,material){if(!parts.length)return;const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());this.disposables.add(g);const mesh=new THREE.Mesh(g,material);this.root.add(mesh);this.occluders.push(mesh);}
 instance(geometry,entries){
  if(!entries.length)return;const mesh=new THREE.InstancedMesh(geometry,this.leafMaterial,entries.length),n=new THREE.Object3D(),c=new THREE.Color();
  entries.forEach((e,i)=>{n.position.set(e.x,e.y,e.z);n.rotation.set(e.rx,e.ry,e.rz);n.scale.setScalar(e.scale);n.updateMatrix();mesh.setMatrixAt(i,n.matrix);mesh.setColorAt(i,c.setRGB(e.r,e.g,e.b));});
  mesh.computeBoundingSphere();this.root.add(mesh);this.instanced.push(mesh);return mesh;
 }
 makeSpray(){
  const rnd=this.seeded(420),pos=[];
  for(let i=0;i<(this.mobile?55:110);i++)pos.push(riverCentre(1)+(rnd()-.5)*5,riverSurface(1)+rnd()*2.6,.7+(rnd()-.5)*3);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));this.disposables.add(g);
  this.spray=new THREE.Points(g,new THREE.PointsMaterial({map:this.moteMap,color:'#edf8f2',size:.14,transparent:true,opacity:.32,depthWrite:false}));
  this.disposables.add(this.spray.material);this.root.add(this.spray);
 }
 update(time){if(this.wind)this.wind.value=time;this.rippleMap.offset.y=-time*.025;this.flowMap.offset.y=time*.07;this.spray.position.y=Math.sin(time*.7)*.1;}
 lowerQuality(){for(const mesh of this.instanced){if(mesh.geometry===this.shapes.cover)mesh.count=Math.max(1,Math.round(mesh.count*.65));}this.spray.visible=false;}
 dispose(){for(const mesh of this.instanced)mesh.dispose();for(const item of this.disposables)item.dispose?.();this.root.clear();}
}
