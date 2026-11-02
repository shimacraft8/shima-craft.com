import * as THREE from 'three';
import {LivingForest} from './forest.js';
import {planAnimals,terrainHeight,riverCentre,riverEdge,onLand,VIEWPOINTS} from './model.js';

export class ForestWorld {
 constructor(scene,{mobile,species,onDirty}){
  Object.assign(this,{scene,mobile,onDirty,disposed:false,animals:planAnimals(species),byId:new Map()});
  this.root=new THREE.Group();scene.add(this.root);
  for(const p of this.animals){
   // Stay on an actual bank rather than bury a drawing under the stream.
   if(p.perch==='water'){p.x=riverCentre(p.z)+riverEdge(p.z)+.25;}
   if(!['water','sand'].includes(p.perch)&&!onLand(p.x,p.z)){
    const sign=p.x-riverCentre(p.z)>=0?1:-1;
    for(let n=0;n<12&&!onLand(p.x,p.z);n++)p.x+=sign*.65;
   }
   p.state='idle';p.label=new THREE.Vector3();this.byId.set(p.id,p);
  }
  scene.background=new THREE.Color('#b9d3d0');scene.fog=new THREE.FogExp2('#b9d3d0',.0065);
  this.hemi=new THREE.HemisphereLight('#d4ece0','#526044',1.55);this.sun=new THREE.DirectionalLight('#fff1c8',2.1);
  this.sun.position.set(-45,85,-30);this.fill=new THREE.DirectionalLight('#bbd8d3',.7);this.fill.position.set(30,12,25);
  scene.add(this.hemi,this.sun,this.fill);
  this.forest=new LivingForest(this.root,{mobile,placements:this.animals});
  this.skyGeometry=new THREE.SphereGeometry(1200,24,16);
  this.skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
   vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec3 vDirection;void main(){float y=normalize(vDirection).y;vec3 horizon=vec3(.66,.80,.79);vec3 zenith=vec3(.20,.47,.59);vec3 c=mix(horizon,zenith,smoothstep(0.,.85,y));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  this.sky=new THREE.Mesh(this.skyGeometry,this.skyMaterial);this.root.add(this.sky);
  this.shadowMap=this.contactShadowTexture();this.shadowGeometry=new THREE.PlaneGeometry(1,1);this.shadowGeometry.rotateX(-Math.PI/2);
  this.shadowMaterial=new THREE.MeshBasicMaterial({map:this.shadowMap,transparent:true,depthWrite:false,color:'#17251a',opacity:.4});
  // Forty small local cutouts, progressively decoded. Never fetched from a third-party origin.
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
 /** Drawings have different amounts of empty margin; measure the animal itself. */
 opaqueBox(image){
  const full={x:0,y:0,w:image.width,h:image.height};
  try{
   const m=96,probe=document.createElement('canvas');probe.width=probe.height=m;
   const px=probe.getContext('2d',{willReadFrequently:true});px.drawImage(image,0,0,m,m);
   const data=px.getImageData(0,0,m,m).data;
   let minX=m,minY=m,maxX=-1,maxY=-1;
   for(let y=0;y<m;y++)for(let x=0;x<m;x++){
    if(data[(y*m+x)*4+3]<10)continue;
    if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
   }
   if(maxX<minX||maxY<minY)return full;
   const sx=image.width/m,sy=image.height/m;
   const x0=Math.max(0,(minX-2)*sx),y0=Math.max(0,(minY-2)*sy);
   const x1=Math.min(image.width,(maxX+3)*sx),y1=Math.min(image.height,(maxY+3)*sy);
   if(x1-x0<8||y1-y0<8)return full;
   return {x:x0,y:y0,w:x1-x0,h:y1-y0};
  }catch{return full;}
 }
 /** Give the illustration a cut-paper border and a probe used for alpha-accurate picking. */
 cutout(image){
  const box=this.opaqueBox(image);
  const limit=this.mobile?384:512,fit=Math.min(1,limit/Math.max(box.w,box.h));
  const w=Math.max(16,Math.round(box.w*fit)),h=Math.max(16,Math.round(box.h*fit));
  const pad=1;
  const silhouette=document.createElement('canvas');silhouette.width=w;silhouette.height=h;
  const sx=silhouette.getContext('2d');sx.drawImage(image,box.x,box.y,box.w,box.h,0,0,w,h);
  sx.globalCompositeOperation='source-in';sx.fillStyle='#f7efdc';sx.fillRect(0,0,w,h);
  const canvas=document.createElement('canvas');canvas.width=w+pad*2;canvas.height=h+pad*2;
  const x=canvas.getContext('2d');

  x.globalAlpha=.5;x.drawImage(silhouette,pad,pad+pad*.45);x.globalAlpha=1;
  x.drawImage(image,box.x,box.y,box.w,box.h,pad,pad,w,h);
  // A single warm wash keeps forty separately generated drawings in one palette.
  x.globalCompositeOperation='source-atop';x.globalAlpha=.08;x.fillStyle='#efdfb6';
  x.fillRect(0,0,canvas.width,canvas.height);x.globalAlpha=1;x.globalCompositeOperation='source-over';
  let probe=null;
  try{
   const size=40,pc=document.createElement('canvas');pc.width=pc.height=size;
   const px=pc.getContext('2d',{willReadFrequently:true});px.drawImage(canvas,0,0,size,size);
   const data=px.getImageData(0,0,size,size).data,alpha=new Uint8Array(size*size);
   for(let i=0;i<alpha.length;i++)alpha[i]=data[i*4+3];
   probe={size,alpha};
  }catch{/* Picking falls back to the full quad if the canvas cannot be read. */}
  return {canvas,probe,aspect:canvas.width/canvas.height};
 }


 async load(item){
  item.state='loading';
  try{
   const source=await new THREE.TextureLoader().loadAsync(`/wildlife/assets/animals/${item.asset}.webp`);
   if(this.disposed){source.dispose();return;}
   const cut=this.cutout(source.image);source.dispose();
   const texture=new THREE.CanvasTexture(cut.canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
   const height=cut.aspect>=1?item.size/cut.aspect:item.size,width=height*cut.aspect;
   const geometry=new THREE.PlaneGeometry(width,height);geometry.translate(0,height/2,0);
   const material=new THREE.MeshLambertMaterial({map:texture,alphaTest:.4,side:THREE.DoubleSide,color:'#eeefd9'});
   const root=new THREE.Group();root.position.set(item.x,item.y,item.z);
   const mesh=new THREE.Mesh(geometry,material);mesh.userData.id=item.id;root.add(mesh);
   if(['ground','rock','water','sand'].includes(item.perch)){
    const shadow=new THREE.Mesh(this.shadowGeometry,this.shadowMaterial);shadow.scale.set(width*1.25,1,width*.65);shadow.position.y=.014;root.add(shadow);
   }
   this.root.add(root);Object.assign(item,{state:'ready',root,mesh,texture,geometry,material,probe:cut.probe,height,width});this.onDirty();
  }catch{item.state='failed';this.onDirty();}
 }
 update(time,camera){
  for(const item of this.animals){if(item.state!=='ready')continue;
   item.mesh.rotation.y=Math.atan2(camera.position.x-item.x,camera.position.z-item.z);
   item.root.visible=camera.position.distanceToSquared(item.root.position)<110*110;
  }
  this.forest.update(time);
 }
 pickables(){return this.animals.filter(p=>p.state==='ready'&&p.root.visible).map(p=>p.mesh);}
 opaqueAt(id,uv){const p=this.byId.get(id)?.probe;if(!p||!uv)return true;
  const x=Math.max(0,Math.min(p.size-1,Math.round(uv.x*(p.size-1)))),y=Math.max(0,Math.min(p.size-1,Math.round((1-uv.y)*(p.size-1))));return p.alpha[y*p.size+x]>110;
 }
 labelTargets(){return this.animals.filter(p=>p.state==='ready'&&p.root.visible).map(p=>{p.label.set(p.x,p.y+p.height+.12,p.z);return p;});}
 dispose(){this.disposed=true;this.queue.length=0;for(const p of this.animals){if(p.state==='ready'){p.geometry.dispose();p.material.dispose();p.texture.dispose();}}
  this.forest.dispose();this.skyGeometry.dispose();this.skyMaterial.dispose();this.shadowGeometry.dispose();this.shadowMaterial.dispose();this.shadowMap.dispose();this.root.removeFromParent();this.scene.remove(this.hemi,this.sun,this.fill);this.scene.fog=null;
 }
}
