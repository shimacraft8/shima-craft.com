import * as THREE from 'three';
import {LivingForest} from './forest.js';
import {planAnimals,riverCentre,riverEdge,onLand,VIEWPOINTS} from './model.js';
import {createVoxelAnimal} from './voxel-animals.js';

export class ForestWorld {
 constructor(scene,{mobile,species,onDirty,onAnimalFailure}){
  Object.assign(this,{scene,mobile,onDirty,onAnimalFailure,disposed:false,animals:planAnimals(species),byId:new Map()});
  this.root=new THREE.Group();scene.add(this.root);
  for(const p of this.animals){
   // Stay on an actual bank rather than bury a drawing under the stream.
   if(p.perch==='water'){p.x=riverCentre(p.z)+riverEdge(p.z)+.25;}
   if(!['water','sand','sea'].includes(p.perch)&&!onLand(p.x,p.z)){
    const sign=p.x-riverCentre(p.z)>=0?1:-1;
    for(let n=0;n<12&&!onLand(p.x,p.z);n++)p.x+=sign*.65;
   }
   p.state='idle';p.label=new THREE.Vector3();this.byId.set(p.id,p);
  }
  scene.background=new THREE.Color('#b9d3d0');scene.fog=new THREE.FogExp2('#b9d3d0',.006);
  this.hemi=new THREE.HemisphereLight('#d4ece0','#8a9774',1.7);this.sun=new THREE.DirectionalLight('#fff1c8',2.1);
  this.sun.position.set(-45,85,-30);this.fill=new THREE.DirectionalLight('#bbd8d3',.7);this.fill.position.set(30,12,25);
  scene.add(this.hemi,this.sun,this.fill);
  this.forest=new LivingForest(this.root,{mobile,placements:this.animals});
  this.skyGeometry=new THREE.SphereGeometry(1200,24,16);
  this.skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{horizonColor:{value:new THREE.Color('#b9d3d0')},zenithColor:{value:new THREE.Color('#5c9fb8')}},
   vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 horizonColor;uniform vec3 zenithColor;varying vec3 vDirection;void main(){float y=normalize(vDirection).y;vec3 c=mix(horizonColor,zenithColor,smoothstep(0.,.85,y));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  this.sky=new THREE.Mesh(this.skyGeometry,this.skyMaterial);this.root.add(this.sky);
  this.shadowMap=this.contactShadowTexture();this.shadowGeometry=new THREE.PlaneGeometry(1,1);this.shadowGeometry.rotateX(-Math.PI/2);
  this.shadowMaterial=new THREE.MeshBasicMaterial({map:this.shadowMap,transparent:true,depthWrite:false,color:'#17251a',opacity:.4});
  // Each species is real block geometry. Build in small tasks to keep first paint responsive.
  this.queue=[...this.animals];this.pending=0;this.pump();
 }
 pump(){while(this.pending<3&&this.queue.length&&!this.disposed){this.pending++;this.load(this.queue.shift()).finally(()=>{this.pending--;this.pump();});}}
 contactShadowTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'#ffffffee');g.addColorStop(.45,'#ffffff8c');g.addColorStop(1,'#ffffff00');
  x.fillStyle=g;x.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }
 async load(item){
  item.state='loading';
  try{
   // Yield between species: forty meshes should not block the controls on a small phone.
   await new Promise(resolve=>setTimeout(resolve,0));if(this.disposed)return;
   const model=createVoxelAnimal(item.id);if(!model)throw new Error('Missing voxel species');
   const size=model.bounds.getSize(new THREE.Vector3()),scale=item.size/Math.max(size.x,size.y,size.z);
   model.group.scale.setScalar(scale);
   const root=new THREE.Group();root.position.set(item.x,item.y,item.z);root.add(model.group);
   const view=VIEWPOINTS.find(v=>v.id===item.spot)||VIEWPOINTS[0];
   if(item.surfaceNormal){
    root.rotation.order='YXZ';root.rotation.y=Math.atan2(item.surfaceNormal.x,item.surfaceNormal.z);root.rotation.x=Math.PI/2;
   }else root.rotation.y=Math.atan2(item.x-view.x,item.z-view.z)+.4;
   for(const mesh of model.meshes)mesh.userData.id=item.id;
   if(['ground','rock','water','sand'].includes(item.perch)){
    const shadow=new THREE.Mesh(this.shadowGeometry,this.shadowMaterial);shadow.scale.set(size.x*scale*1.25,1,size.z*scale*.8);shadow.position.y=.014;root.add(shadow);
   }
   if(item.perch==='sea')for(const mesh of model.meshes)mesh.castShadow=false;
   this.root.add(root);root.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(model.group),height=box.max.y-root.position.y;
   Object.assign(item,{state:'ready',root,model,height,width:Math.max(size.x,size.z)*scale});this.onDirty();
  }catch{item.state='failed';console.warn('Voxel model unavailable:',item.id);this.onAnimalFailure?.(item.id);this.onDirty();}
 }
 update(time,camera){
  for(const item of this.animals){if(item.state!=='ready')continue;
   if(item.perch==='sea'){const phase=item.id==='green-turtle'?0:2.5;item.root.position.set(item.x+Math.sin(time*.22+phase)*.45,item.y+Math.sin(time*.5+phase)*.06,item.z+Math.sin(time*.17+phase)*.25);}
   if(item.perch==='cave-air')item.root.position.y=item.y+Math.sin(time*.8)*.06;
   item.model.update(time);
   item.root.visible=camera.position.distanceToSquared(item.root.position)<110*110;
  }
  this.forest.update(time);
 }
 pickables(){return this.animals.filter(p=>p.state==='ready'&&p.root.visible).flatMap(p=>p.model.meshes);}
 opaqueAt(){return true;}
 labelTargets(){return this.animals.filter(p=>p.state==='ready'&&p.root.visible).map(p=>{p.label.set(p.root.position.x,p.root.position.y+p.height+.12,p.root.position.z);return p;});}
 dispose(){this.disposed=true;this.queue.length=0;for(const p of this.animals){if(p.state==='ready'){p.model.dispose();}}
  this.forest.dispose();this.skyGeometry.dispose();this.skyMaterial.dispose();this.shadowGeometry.dispose();this.shadowMaterial.dispose();this.shadowMap.dispose();this.root.removeFromParent();this.scene.remove(this.hemi,this.sun,this.fill);this.scene.fog=null;
 }
}
