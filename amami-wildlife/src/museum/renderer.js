import * as THREE from 'three';
import {ForestWorld} from './paper-world.js';
import {VIEWPOINTS,terrainHeight,wrapAngle,yawTo,rad,clamp,nearestLandmark} from './model.js';

/** Eye-level free look. No wheel handler, pointer lock, scroll timeline or orbiting diorama. */
export class MuseumRenderer {
 constructor(host,{species,paused,onSelect,onLabels,onFailure,onStatus,onPlace,onZoom,onReady}){
  Object.assign(this,{host,paused,onSelect,onLabels,onFailure,onStatus,onPlace,onZoom,onReady,disposed:false,warming:true,raf:0,time:0,last:0,lastLabels:0,dialog:false,visible:!document.hidden,inView:true,dirty:true,yaw:0,pitch:0,spot:0,drag:null,quality:0,slow:0});
  this.mobile=matchMedia('(max-width: 700px)').matches;this.scene=new THREE.Scene();
  this.renderer=new THREE.WebGLRenderer({antialias:!this.mobile,alpha:false,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.35:1.6));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  const canvas=this.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown Home');canvas.setAttribute('aria-label','360度の奄美の森。ドラッグまたは矢印キーで見回せます。森を出るボタンで図鑑に戻れます。');host.replaceChildren(canvas);
  this.baseFov=this.mobile?76:68;this.zoomLevel=0;this.targetFov=this.baseFov;this.camera=new THREE.PerspectiveCamera(this.baseFov,1,.08,1800);this.camera.rotation.order='YXZ';
  try{this.world=new ForestWorld(this.scene,{species,mobile:this.mobile,onDirty:()=>this.invalidate()});}catch(error){
   this.scene.traverse(node=>{node.geometry?.dispose();for(const m of Array.isArray(node.material)?node.material:[node.material]){if(!m)continue;for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});this.renderer.dispose();this.renderer.forceContextLoss();host.replaceChildren();throw error;
  }
  this.pointer=new THREE.Vector2();this.ray=new THREE.Raycaster();this.projected=new THREE.Vector3();
  this.bindings=[];this.listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);this.bindings.push(()=>node.removeEventListener(type,fn,options));};
  this.listen(canvas,'pointerdown',e=>{if(e.button!==0)return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:0};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
  this.listen(canvas,'pointermove',e=>{
   if(!this.drag||this.drag.id!==e.pointerId)return;
   const d=this.drag;d.moved=Math.max(d.moved,Math.hypot(e.clientX-d.startX,e.clientY-d.startY));
   this.turn(-(e.clientX-d.x)*.004,-(e.clientY-d.y)*.003);d.x=e.clientX;d.y=e.clientY;
  });
  this.listen(canvas,'pointerup',e=>{const d=this.drag;this.drag=null;if(!d||d.id!==e.pointerId)return;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(d.moved<7)this.pick(e.clientX,e.clientY);});
  this.listen(canvas,'pointercancel',()=>{this.drag=null;});
  this.listen(canvas,'keydown',e=>{
   const keys={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]};
   if(keys[e.key]){e.preventDefault();this.turn(...keys[e.key]);}
   if(e.key==='Home'){e.preventDefault();this.goToSpot(0);}
  });
  this.listen(document,'visibilitychange',()=>{this.visible=!document.hidden;this.refresh();});
  this.listen(canvas,'webglcontextlost',e=>{e.preventDefault();this.lost=true;cancelAnimationFrame(this.raf);this.raf=0;this.onStatus('3Dの接続を復旧しています…');this.contextTimer=setTimeout(()=>this.fail('3Dの接続が戻りませんでした。図鑑を表示します。'),8000);});
  this.listen(canvas,'webglcontextrestored',()=>{clearTimeout(this.contextTimer);this.lost=false;this.onStatus('');this.invalidate();});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
  this.observer=new IntersectionObserver(entries=>{this.inView=entries[0].isIntersecting;this.refresh();});this.observer.observe(host);
  this.goToSpot(0);this.resize();this.onZoom?.(0);
  this.renderer.compileAsync(this.scene,this.camera).then(()=>{if(this.disposed)return;this.warming=false;this.onReady?.();this.invalidate();}).catch(()=>this.fail('3Dの準備ができませんでした。図鑑を表示します。'));
 }
 resize(){if(this.disposed)return;const rect=this.host.getBoundingClientRect();this.rect={left:rect.left,top:rect.top,width:rect.width,height:rect.height};
  if(!rect.width||!rect.height)return;this.renderer.setSize(rect.width,rect.height,false);this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix();this.invalidate();
 }
 goToSpot(value){const index=typeof value==='string'?VIEWPOINTS.findIndex(p=>p.id===value):value;if(!VIEWPOINTS[index])return;
  this.spot=index;const p=VIEWPOINTS[index];this.camera.position.set(p.x,terrainHeight(p.x,p.z)+p.eye,p.z);this.yaw=p.yaw;this.pitch=-.08;this.selected=null;this.onPlace?.(p);this.invalidate();
 }
 focusSpecies(id){const item=this.world.byId.get(id);if(!item)return false;this.goToSpot(item.spotIndex);
  this.yaw=yawTo(this.camera.position.x,this.camera.position.z,item.x,item.z);
  const horizontal=Math.hypot(item.x-this.camera.position.x,item.z-this.camera.position.z);
  this.pitch=clamp(Math.atan2(item.y+item.size*.4-this.camera.position.y,horizontal),rad(-68),rad(78));this.selected=id;this.invalidate();return true;
 }
 zoom(delta){this.zoomLevel=clamp(this.zoomLevel+delta,0,2);this.targetFov=this.baseFov-[0,14,25][this.zoomLevel];this.onZoom?.(this.zoomLevel);if(this.paused){this.camera.fov=this.targetFov;this.camera.updateProjectionMatrix();}this.invalidate();}
 turn(yaw,pitch){this.yaw=wrapAngle(this.yaw+yaw);this.pitch=clamp(this.pitch+pitch,rad(-68),rad(78));this.invalidate();}
 setSelected(id){this.selected=id;this.invalidate();}
 setPaused(value){this.paused=value;this.refresh();}
 setDialog(value){this.dialog=value;this.refresh();}
 invalidate(){if(this.disposed)return;this.dirty=true;this.refresh();}
 refresh(){if(this.disposed||this.lost||this.warming)return;const allowed=this.visible&&this.inView&&!this.dialog;
  if(!allowed){cancelAnimationFrame(this.raf);this.raf=0;this.last=0;return;}
  if(!this.raf&&(this.dirty||!this.paused))this.raf=requestAnimationFrame(t=>this.frame(t));
 }
 frame(now){
  this.raf=0;if(this.disposed||this.lost||!this.visible||!this.inView||this.dialog)return;
  if(!this.paused&&this.last&&now-this.last<1000/30&&!this.dirty){this.refresh();return;}
  const delta=this.last?Math.min(.1,(now-this.last)/1000):0;this.last=now;if(!this.paused)this.time+=delta;
  if(Math.abs(this.camera.fov-this.targetFov)>.05){this.camera.fov+=(this.targetFov-this.camera.fov)*.24;this.camera.updateProjectionMatrix();}
  this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
  // Three's +rotation around Y looks west; convert our clockwise heading convention.
  this.camera.rotation.y=-this.yaw;this.camera.updateMatrixWorld();this.world.update(this.time,this.camera);
  this.scene.updateMatrixWorld();this.renderer.render(this.scene,this.camera);
  if(this.dirty||now-this.lastLabels>120){this.labels();this.lastLabels=now;}
  const info=this.renderer.info.render;
  if(this.dirty||!this.lastMetrics||now-this.lastMetrics>500){this.lastMetrics=now;Object.assign(this.host.dataset,{heading:String(Math.round((this.yaw*180/Math.PI+360)%360)),pitch:String(Math.round(this.pitch*180/Math.PI)),spot:VIEWPOINTS[this.spot].id,ready:'true',animalsReady:String(this.world.animals.filter(p=>p.state==='ready').length),drawCalls:String(info.calls),triangles:String(info.triangles),dpr:String(this.renderer.getPixelRatio()),zoom:String(this.zoomLevel),fov:String(Math.round(this.camera.fov))});}
  if(delta>.052&&!this.dirty)this.slow++;else this.slow=Math.max(0,this.slow-1);
  if(this.slow>80&&this.quality<2){this.quality++;this.renderer.setPixelRatio(Math.max(.85,this.renderer.getPixelRatio()*.8));this.world.forest.lowerQuality();this.slow=0;}
  this.dirty=false;this.refresh();
 }
 labels(){
  const w=this.rect?.width??1,h=this.rect?.height??1,candidates=[];
  for(const p of this.world.labelTargets()){
   const depth=this.camera.position.distanceTo(p.label);if(depth>29)continue;
   this.projected.copy(p.label).project(this.camera);
   if(this.projected.z<-1||this.projected.z>1||Math.abs(this.projected.x)>.92||Math.abs(this.projected.y)>.82)continue;
   // Terrain occlusion prevents markers being seen through the hillside.
   let blocked=false;for(let k=1;k<16;k++){const t=k/16,x=this.camera.position.x+(p.x-this.camera.position.x)*t,z=this.camera.position.z+(p.z-this.camera.position.z)*t,y=this.camera.position.y+(p.label.y-this.camera.position.y)*t;if(terrainHeight(x,z)>y+.12){blocked=true;break;}}
   if(blocked)continue;
   candidates.push({id:p.id,name:p.name,x:clamp((this.projected.x*.5+.5)*w,106,w-106),y:(-.5*this.projected.y+.5)*h,depth,selected:p.id===this.selected});
  }
  candidates.sort((a,b)=>Number(b.selected)-Number(a.selected)||a.depth-b.depth);
  const selected=[];for(const p of candidates){if(p.y<110||p.y>h-150||selected.some(q=>Math.abs(p.x-q.x)<150&&Math.abs(p.y-q.y)<68))continue;selected.push(p);if(selected.length>=(this.mobile?3:6))break;}
  this.onLabels(selected);
 }
 pick(x,y){if(!this.rect||this.dialog)return;
  this.pointer.set((x-this.rect.left)/this.rect.width*2-1,-(y-this.rect.top)/this.rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);
  const hit=this.ray.intersectObjects(this.world.pickables()).find(h=>this.world.opaqueAt(h.object.userData.id,h.uv));const cover=hit?this.ray.intersectObjects(this.world.forest.occluders)[0]:null;if(hit&&(!cover||hit.distance<cover.distance+.03))this.onSelect(hit.object.userData.id);else this.zoom(this.zoomLevel?-this.zoomLevel:1);
 }
 fail(message){if(this.disposed)return;this.dispose();this.onFailure(message);}
 dispose(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.raf);clearTimeout(this.contextTimer);this.resizeObserver?.disconnect();this.observer?.disconnect();this.bindings?.forEach(fn=>fn());
  this.world.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.host.replaceChildren();
 }
}
