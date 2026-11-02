import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mix} from './model.js';
export class VegetationTools {
 /* ---------- deterministic helpers ---------- */
 seeded(seed){let s=(seed>>>0)||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
 relief(x,z){return Math.sin(x*.42+z*.21)*.1+Math.cos(x*.17-z*.36)*.08+Math.sin(x*1.07+z*.83)*.022;}
 dapple(x,z){return .5+.5*Math.sin(x*.31+z*.17)*Math.cos(x*.12-z*.29);}

 /* ---------- hand-drawn style source textures ---------- */
 canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 texture(canvas,{repeat,srgb=true,anisotropy=2}={}){
  const t=new THREE.CanvasTexture(canvas);if(srgb)t.colorSpace=THREE.SRGBColorSpace;
  if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat[0],repeat[1]);}
  t.anisotropy=anisotropy;this.disposables.add(t);return t;
 }
 makeTextures(){
  this.leafMap=this.texture(this.leafAtlas(),{anisotropy:4});
  this.barkMap=this.texture(this.barkCanvas(),{repeat:[1,1]});
  this.soilMap=this.texture(this.soilCanvas(),{repeat:[26,26],anisotropy:4});
  this.shadeMap=this.texture(this.shadeCanvas(),{srgb:false});
  this.moteMap=this.texture(this.moteCanvas());
  this.rippleMap=this.texture(this.rippleCanvas(),{repeat:[6,10],srgb:false});
  this.rippleMap.wrapS=this.rippleMap.wrapT=THREE.RepeatWrapping;
 }
 /** Four leaf silhouettes in one atlas: broad, lance, pinnate frond, large round. */
 leafAtlas(){
  const c=this.canvas(512,512),x=c.getContext('2d');
  const shade=(ctx,x0,y0,x1,y1,a,b,c2)=>{const g=ctx.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,a);g.addColorStop(.52,b);g.addColorStop(1,c2);return g;};
  // 0: broad ovate leaf
  x.save();x.translate(0,0);
  const broad=new Path2D();broad.moveTo(128,244);broad.bezierCurveTo(22,196,26,74,128,12);broad.bezierCurveTo(230,74,234,196,128,244);
  x.fillStyle=shade(x,24,8,232,240,'#2f6440','#8fae66','#375f3f');x.fill(broad);
  x.save();x.clip(broad);x.strokeStyle='#dfe3a63a';x.lineWidth=2.2;
  for(let i=0;i<9;i++){const y=34+i*22;x.beginPath();x.moveTo(128,y+16);x.quadraticCurveTo(92,y+2,34,y-18);x.moveTo(128,y+16);x.quadraticCurveTo(164,y+2,222,y-18);x.stroke();}
  x.strokeStyle='#b4c982';x.lineWidth=3;x.beginPath();x.moveTo(128,246);x.bezierCurveTo(132,160,124,86,128,12);x.stroke();x.restore();x.restore();
  // 1: narrow lance leaf
  x.save();x.translate(256,0);
  const lance=new Path2D();lance.moveTo(128,250);lance.bezierCurveTo(70,186,66,70,124,8);lance.bezierCurveTo(190,74,186,188,128,250);
  x.fillStyle=shade(x,70,10,186,248,'#49763f','#9cb86a','#2f5a3a');x.fill(lance);
  x.save();x.clip(lance);x.strokeStyle='#c8d79840';x.lineWidth=2;
  for(let i=0;i<11;i++){const y=22+i*20;x.beginPath();x.moveTo(126,y+14);x.lineTo(76,y-10);x.moveTo(126,y+14);x.lineTo(178,y-10);x.stroke();}x.restore();x.restore();
  // 2: pinnate frond (one quad renders a whole arching frond)
  x.save();x.translate(0,256);
  x.strokeStyle='#6c8d4d';x.lineWidth=5;x.beginPath();x.moveTo(128,252);x.bezierCurveTo(132,170,126,80,128,16);x.stroke();
  for(let i=0;i<17;i++){
   const t=i/17,y=244-t*224,len=Math.sin(Math.min(1,t*1.25)*Math.PI*.82)*96+10;
   for(const side of[-1,1]){
    x.fillStyle=i%2?'#4d7a46':'#5f8c4c';x.beginPath();
    x.moveTo(128,y);x.quadraticCurveTo(128+side*len*.6,y-6,128+side*len,y-16);
    x.quadraticCurveTo(128+side*len*.55,y+6,128,y+9);x.closePath();x.fill();
   }
  }
  x.restore();
  // 3: large round understory leaf
  x.save();x.translate(256,256);
  const big=new Path2D();big.moveTo(128,250);big.bezierCurveTo(10,210,6,56,128,14);big.bezierCurveTo(250,56,246,210,128,250);
  x.fillStyle=shade(x,8,14,248,250,'#38714a','#86a862','#2d5739');x.fill(big);
  x.save();x.clip(big);x.strokeStyle='#d3dc9b38';x.lineWidth=3;
  for(let i=0;i<7;i++){const a=-1.25+i*.42;x.beginPath();x.moveTo(128,244);x.lineTo(128+Math.sin(a)*150,244-Math.cos(a)*230);x.stroke();}x.restore();x.restore();
  return c;
 }
 barkCanvas(){
  const c=this.canvas(128,512),x=c.getContext('2d'),rnd=this.seeded(4417),r=(a,b)=>a+(b-a)*rnd();
  x.fillStyle='#8a8771';x.fillRect(0,0,128,512);
  for(let i=0;i<820;i++){const px=r(0,128),py=r(0,512);x.strokeStyle=rnd()>.5?'#3f4536aa':'#c3c7a566';x.lineWidth=r(.3,2.4);
   x.beginPath();x.moveTo(px,py);x.bezierCurveTo(px+r(-5,5),py+22,px+r(-6,6),py+44,px+r(-3,3),py+r(24,110));x.stroke();}
  for(let i=0;i<40;i++){x.fillStyle=rnd()>.5?'#6b7d5522':'#d8d9b41e';x.beginPath();x.ellipse(r(0,128),r(0,512),r(4,16),r(10,40),r(0,3),0,6.3);x.fill();}
  return c;
 }
 soilCanvas(){
  const c=this.canvas(256,256),x=c.getContext('2d'),rnd=this.seeded(911),r=(a,b)=>a+(b-a)*rnd();
  x.fillStyle='#b4af97';x.fillRect(0,0,256,256);
  for(let i=0;i<11000;i++){x.fillStyle=rnd()>.45?'#efdfbc26':'#2f4b3630';x.fillRect(r(0,256),r(0,256),r(.3,2),r(.3,3));}
  for(let i=0;i<120;i++){x.fillStyle=rnd()>.4?'#8c745338':'#d2c9a52e';x.beginPath();x.ellipse(r(0,256),r(0,256),r(1,5),r(.4,1.6),r(0,3),0,6.3);x.fill();}
  return c;
 }
 /** Soft canopy shade, applied as ambient occlusion instead of a real-time shadow pass. */
 shadeCanvas(){
  const c=this.canvas(256,256),x=c.getContext('2d'),rnd=this.seeded(7321),r=(a,b)=>a+(b-a)*rnd();
  x.fillStyle='#ffffff';x.fillRect(0,0,256,256);
  for(let i=0;i<150;i++){
   const px=r(0,256),py=r(0,256),rad=r(12,54),g=x.createRadialGradient(px,py,0,px,py,rad);
   g.addColorStop(0,'#3d4a3a85');g.addColorStop(1,'#3d4a3a00');x.fillStyle=g;x.beginPath();x.arc(px,py,rad,0,6.3);x.fill();
  }
  return c;
 }
 moteCanvas(){
  const c=this.canvas(32,32),x=c.getContext('2d'),g=x.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'#fff6d2');g.addColorStop(.45,'#efe0a480');g.addColorStop(1,'#efe0a400');x.fillStyle=g;x.fillRect(0,0,32,32);return c;
 }
 rippleCanvas(){
  const c=this.canvas(128,128),x=c.getContext('2d');x.fillStyle='#8080ff';x.fillRect(0,0,128,128);
  for(let i=0;i<26;i++){const y=i*5+(i%2)*2;x.strokeStyle=i%2?'#9a96ff':'#6f78ff';x.lineWidth=2.4;x.beginPath();
   for(let px=0;px<=128;px+=8)x.lineTo(px,y+Math.sin(px*.11+i)*2.4);x.stroke();}
  return c;
 }

 /* ---------- shared materials ---------- */
 makeMaterials(){
  this.leafMaterial=new THREE.MeshLambertMaterial({map:this.leafMap,alphaTest:.42,side:THREE.DoubleSide,emissive:'#2c4a32',emissiveIntensity:.17});
  this.leafMaterial.onBeforeCompile=shader=>{
   shader.uniforms.windTime={value:0};this.wind=shader.uniforms.windTime;
   shader.vertexShader='uniform float windTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n#ifdef USE_INSTANCING\n transformed.x += sin(windTime*.62 + instanceMatrix[3].x*.7 + instanceMatrix[3].z*.35)*.05*uv.y;\n transformed.z += cos(windTime*.47 + instanceMatrix[3].z*.6)*.03*uv.y;\n#endif');
  };
  this.barkMaterial=new THREE.MeshLambertMaterial({map:this.barkMap,color:'#b0a98c'});
  this.groundMaterial=new THREE.MeshLambertMaterial({map:this.soilMap,aoMap:this.shadeMap,aoMapIntensity:.9,vertexColors:true});
  this.rockMaterial=new THREE.MeshLambertMaterial({color:'#6d7857',vertexColors:true});
  this.waterMaterial=new THREE.MeshPhongMaterial({color:'#5d8f8c',transparent:true,opacity:.78,shininess:92,specular:'#dff1e8',normalMap:this.rippleMap,normalScale:new THREE.Vector2(.22,.22)});
  this.moteMaterial=new THREE.PointsMaterial({map:this.moteMap,size:this.mobile?.09:.07,transparent:true,opacity:.5,depthWrite:false,sizeAttenuation:true});
  this.shaftMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
   uniforms:{shaftLevel:{value:1}},
   vertexShader:'attribute float aStrength;varying vec2 vUv;varying float vS;void main(){vUv=uv;vS=aStrength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform float shaftLevel;varying vec2 vUv;varying float vS;void main(){float a=pow(sin(vUv.x*3.14159),3.0)*smoothstep(0.0,.35,vUv.y)*(1.0-vUv.y)*.15*vS*shaftLevel;gl_FragColor=vec4(.95,.91,.66,a);}'});
  for(const m of [this.leafMaterial,this.barkMaterial,this.groundMaterial,this.rockMaterial,this.waterMaterial,this.moteMaterial,this.shaftMaterial])this.disposables.add(m);
 }

 /* ---------- shared leaf shapes ---------- */
 // flipY means uv row 0 is the lower half of the atlas; the inset keeps mipmaps from bleeding.
 cell(column,row){const u=column*.5,v=1-(row+1)*.5,pad=6/512;return{u0:u+pad,u1:u+.5-pad,v0:v+pad,v1:v+.5-pad};}
 blade(cell,w,h,bend=.22,segments=2){
  const g=new THREE.PlaneGeometry(w,h,1,segments);g.translate(0,h/2,0);
  const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
   const y=p.getY(i)/h,x=p.getX(i);
   p.setZ(i,Math.sin(y*2.6)*bend*h*.5-Math.abs(x)*.2);p.setY(i,p.getY(i)-y*y*bend*h*.3);
   uv.setXY(i,cell.u0+uv.getX(i)*(cell.u1-cell.u0),cell.v0+uv.getY(i)*(cell.v1-cell.v0));
  }
  g.computeVertexNormals();return g;
 }
 sprig(cell,blades,{w,h,spread=.1,droop=-.55,bend=.22,twist=0}){
  const parts=[],node=new THREE.Object3D();
  for(let i=0;i<blades;i++){
   const a=i/blades*Math.PI*2+i*.6,scale=.72+(i%3)*.17;
   const g=this.blade(cell,w*scale,h*scale,bend);
   node.position.set(Math.sin(a)*spread,i*h*.055,Math.cos(a)*spread);
   node.rotation.set(droop+(i%2)*.18,a,twist*(i%2?1:-1));node.updateMatrix();
   parts.push(g.applyMatrix4(node.matrix));
  }
  const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());this.disposables.add(merged);return merged;
 }
 makeShapes(){
  const broad=this.cell(0,0),lance=this.cell(1,0),frond=this.cell(0,1),round=this.cell(1,1);
  this.shapes={
   broad:this.sprig(broad,5,{w:.82,h:1.1,spread:.16,droop:-.62,twist:.2}),
   lance:this.sprig(lance,6,{w:.42,h:1.35,spread:.12,droop:-.5,bend:.3}),
   frond:this.sprig(frond,3,{w:.95,h:2.1,spread:.08,droop:-.95,bend:.3}),
   round:this.sprig(round,3,{w:1.25,h:1.3,spread:.2,droop:-.75,bend:.18}),
   cover:this.sprig(lance,4,{w:.3,h:.62,spread:.07,droop:-.7,bend:.26}),
   flower:this.sprig(broad,5,{w:.17,h:.24,spread:.05,droop:-1.15,bend:.1}),
   litter:this.blade(broad,.3,.34,.05,1)
  };
  this.disposables.add(this.shapes.litter);
 }

 tube(points,r0,r1,steps=6,sides=6){
  const curve=new THREE.CatmullRomCurve3(points),frames=curve.computeFrenetFrames(steps,false);
  const vertices=[],uvs=[],indices=[],length=curve.getLength();
  for(let i=0;i<=steps;i++){
   const t=i/steps,c=curve.getPoint(t),radius=mix(r0,r1,t);
   for(let j=0;j<=sides;j++){
    const a=j/sides*Math.PI*2;
    const offset=frames.normals[i].clone().multiplyScalar(Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);
    vertices.push(c.x+offset.x,c.y+offset.y,c.z+offset.z);uvs.push(j/sides,t*length*.35);
   }
  }
  for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();return g;
 }
 leafAt(ctx,kind,pos,{scale,rx=0,ry=0,rz=0,shade=1,warm=0}){
  ctx.batches[kind].push({x:pos.x,y:pos.y,z:pos.z,scale,rx,ry,rz,r:shade*(1+warm*.5),g:shade*(1-warm*.12),b:shade*(.92-warm*.35)});
 }
 crown(ctx,centre,radius,count,rnd,kind='broad',shade=1){
  for(let i=0;i<count;i++){
   const a=rnd()*Math.PI*2,r=Math.pow(rnd(),.45)*radius,y=(rnd()-.5)*radius*1.1;
   this.leafAt(ctx,kind,{x:centre.x+Math.cos(a)*r,y:centre.y+y,z:centre.z+Math.sin(a)*r},
    {scale:.62+rnd()*.75,rx:-1.1+rnd()*1.5,ry:rnd()*6.28,rz:(rnd()-.5)*.9,shade:shade*(.72+rnd()*.46)});
  }
 }
 bigTree(ctx,t,u,rnd){
  const rng=(a,b)=>a+(b-a)*rnd(),base=this.groundPoint(t,u),height=rng(11,17.5),radius=rng(.4,.72);
  const lean=new THREE.Vector3(rng(-1.1,1.1),0,rng(-1.1,1.1));
  const top=new THREE.Vector3(base.x+lean.x,base.y+height,base.z+lean.z);
  ctx.trunks.push(this.tube([base,new THREE.Vector3(base.x+lean.x*.1,base.y+height*.35,base.z+lean.z*.1),
   new THREE.Vector3(base.x+lean.x*.6,base.y+height*.72,base.z+lean.z*.6),top],radius,radius*.2,7,7));
  for(let i=0;i<5;i++){
   const a=i*1.27+rnd();
   ctx.trunks.push(this.tube([
    new THREE.Vector3(base.x+Math.cos(a)*radius*3.6,base.y-.1,base.z+Math.sin(a)*radius*3.6),
    new THREE.Vector3(base.x+Math.cos(a)*radius*1.5,base.y+.55,base.z+Math.sin(a)*radius*1.5),
    new THREE.Vector3(base.x,base.y+1.7,base.z)],radius*.3,radius*.14,4,6));
  }
  const branches=4+Math.round(rnd()*2);
  for(let i=0;i<branches;i++){
   const a=i*(6.28/branches)+rnd()*.7,h=height*(.5+i*.08),extent=rng(2.2,4.4);
   const start=new THREE.Vector3(base.x+lean.x*.5,base.y+h,base.z+lean.z*.5);
   const end=new THREE.Vector3(start.x+Math.cos(a)*extent,start.y+rng(.4,1.9),start.z+Math.sin(a)*extent);
   ctx.trunks.push(this.tube([start,start.clone().lerp(end,.55).setY(start.y+(end.y-start.y)*.4+.3),end],radius*.34,.045,5,6));
   this.crown(ctx,end,1.6,this.scale(17),rnd,'broad');
   if(end.y-base.y>2.1&&end.y-base.y<5.6&&Math.abs(u)<11)ctx.anchors.branch.push({t,u,pos:end.clone(),surface:end.y});
  }
  this.crown(ctx,top,2.3,this.scale(30),rnd,'broad');
  // Hanging aerial roots break the repeated upright trunk silhouette.
  if(rnd()>.45)for(let i=0;i<3;i++){
   const a=rnd()*6.28,drop=rng(2.4,5),from=new THREE.Vector3(base.x+Math.cos(a)*2.4,base.y+height*.62,base.z+Math.sin(a)*2.4);
   ctx.trunks.push(this.tube([from,new THREE.Vector3(from.x+rng(-.4,.4),from.y-drop*.6,from.z+rng(-.4,.4)),
    new THREE.Vector3(from.x+rng(-.7,.7),from.y-drop,from.z+rng(-.7,.7))],.05,.02,4,5));
  }
 }
 slimTree(ctx,t,u,rnd){
  const rng=(a,b)=>a+(b-a)*rnd(),base=this.groundPoint(t,u),height=rng(6.5,12),radius=rng(.11,.26);
  const bend=rng(-1.4,1.4),top=new THREE.Vector3(base.x+bend,base.y+height,base.z+rng(-.8,.8));
  ctx.trunks.push(this.tube([base,new THREE.Vector3(base.x+bend*.2,base.y+height*.45,base.z),top],radius,radius*.26,6,6));
  for(let i=0;i<3;i++){
   const a=i*2.2+rnd(),h=height*(.58+i*.12),extent=rng(1.1,2.4);
   const start=new THREE.Vector3(base.x+bend*.6,base.y+h,base.z);
   const end=new THREE.Vector3(start.x+Math.cos(a)*extent,start.y+rng(.3,1.1),start.z+Math.sin(a)*extent);
   ctx.trunks.push(this.tube([start,end],radius*.4,.03,3,5));
   this.crown(ctx,end,1.1,this.scale(11),rnd,'lance');
   if(end.y-base.y>2&&end.y-base.y<5.2&&Math.abs(u)<10)ctx.anchors.branch.push({t,u,pos:end.clone(),surface:end.y});
  }
  this.crown(ctx,top,1.5,this.scale(20),rnd,'lance');
 }
 shrub(ctx,t,u,rnd){
  const rng=(a,b)=>a+(b-a)*rnd(),base=this.groundPoint(t,u),height=rng(1.1,2.9);
  for(let stem=0;stem<3;stem++){
   const a=stem*2.1+rnd(),top=new THREE.Vector3(base.x+Math.cos(a)*height*.3,base.y+height*rng(.75,1.1),base.z+Math.sin(a)*height*.3);
   ctx.trunks.push(this.tube([base,top],.055,.02,3,5));
   this.crown(ctx,top,.75,this.scale(8),rnd,rnd()>.5?'round':'broad',1.05);
   if(Math.abs(u)<3.6)ctx.anchors.leaf.push({t,u,pos:top.clone(),surface:top.y});
  }
 }
 treeFern(ctx,t,u,rnd){
  const rng=(a,b)=>a+(b-a)*rnd(),base=this.groundPoint(t,u),height=rng(1,3.1);
  const top=new THREE.Vector3(base.x,base.y+height,base.z);
  ctx.trunks.push(this.tube([base,top],.14,.1,4,7));
  for(let i=0;i<7;i++){
   const a=i*.9+rnd()*.3;
   this.leafAt(ctx,'frond',{x:top.x+Math.cos(a)*.3,y:top.y,z:top.z+Math.sin(a)*.3},
    {scale:rng(.85,1.35),rx:-.55-rnd()*.35,ry:a,rz:0,shade:.85+rnd()*.3});
  }
  if(Math.abs(u)<3.4)ctx.anchors.leaf.push({t,u,pos:top.clone(),surface:top.y});
 }
 scale(count){return Math.max(2,Math.round(count*this.budget*(this.mobile?.62:1)));}


}
