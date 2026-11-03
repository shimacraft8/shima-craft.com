/** Shared rendered/walked block surface. Metres; north is -Z. No browser dependency. */
import {VIEWPOINTS,terrainHeight,riverSurface,riverCentre,riverEdge,clamp,smoothstep} from './model.js';
export const CELL=1.25,RISE=.35,EYE=1.62,STEP=.72,RADIUS=.24;
export const WALK_BOUNDS={minX:-51,maxX:57,minZ:-43,maxZ:68};
export const TERRAIN_BOUNDS={minX:-100,maxX:100,minZ:-110,maxZ:155};
const at=id=>VIEWPOINTS.find(p=>p.id===id);
// A connected route, including two timber crossings. Walking is also possible off the path.
export const PATHS=[['floor','hego'],['hego','falls'],['falls','stream'],['stream','estuary'],['estuary','cape'],['cape','shore']].map(([a,b])=>({a:at(a),b:at(b),ha:terrainHeight(at(a).x,at(a).z),hb:terrainHeight(at(b).x,at(b).z)}));
export const quantize=y=>Math.round(y/RISE)*RISE;
export const cellCentre=v=>(Math.floor(v/CELL)+.5)*CELL;
export function pathAt(x,z){
 let best=null;
 for(const {a,b,ha,hb} of PATHS){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,d=Math.hypot(x-px,z-pz);
  if(!best||d<best.distance)best={distance:d,height:quantize(ha*(1-t)+hb*t),t};
 }
 return best;
}
const surfaces=new Map();
export const terrainCacheStats=()=>({cells:surfaces.size,limit:50000});
export function surfaceAt(x,z){
 const key=`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`;if(surfaces.has(key))return surfaces.get(key);
 const cx=cellCentre(x),cz=cellCentre(z),raw=quantize(terrainHeight(cx,cz)-smoothstep(-35,-43,cz)*3.2),path=pathAt(cx,cz),isPath=path.distance<1.7;
 const height=isPath?path.height:raw;
 const water=cz<-46?0:Math.abs(cx-riverCentre(cz))<riverEdge(cz)+.2?riverSurface(cz):0;
 const bridge=isPath&&height>raw+.45;
 const result=Object.freeze({x:cx,z:cz,height,ground:isPath&&!bridge?Math.min(raw,height):raw,path:isPath,bridge,water,dry:height>water+.14});
 if(surfaces.size<50000)surfaces.set(key,result);return result;
}
export const voxelHeight=(x,z)=>surfaceAt(x,z).height;
export function insideBounds(x,z){const b=WALK_BOUNDS;return x>=b.minX+RADIUS&&x<=b.maxX-RADIUS&&z>=b.minZ+RADIUS&&z<=b.maxZ-RADIUS;}
export function canStand(x,z,fromHeight,obstacles=[]){
 if(!insideBounds(x,z))return false;
 const s=surfaceAt(x,z);if(!s.dry||Math.abs(s.height-fromHeight)>STEP+.001)return false;
 for(const o of obstacles)if(Math.abs(x-o.x)<o.hx+RADIUS&&Math.abs(z-o.z)<o.hz+RADIUS&&s.height<o.top&&s.height+EYE>o.bottom)return false;
 return true;
}
/** Substeps prevent tunnelling; separated axes let the player slide along a trunk/bank. */
export function walk(position,input,yaw,seconds,obstacles=[]){
 let {x,z}=position;const length=Math.hypot(input.forward,input.right);if(!length||!Number.isFinite(seconds))return {x,z,height:voxelHeight(x,z),moved:false};
 const dt=clamp(seconds,0,.1),speed=input.fast?5:3.1,normal=Math.max(1,length);
 const f=input.forward/normal,r=input.right/normal;
 const dx=(Math.sin(yaw)*f+Math.cos(yaw)*r)*speed*dt,dz=(-Math.cos(yaw)*f+Math.sin(yaw)*r)*speed*dt;
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.09));
 for(let i=0;i<count;i++){
  const h=voxelHeight(x,z);if(canStand(x+dx/count,z,h,obstacles))x+=dx/count;
  if(canStand(x,z+dz/count,voxelHeight(x,z),obstacles))z+=dz/count;
 }
 return {x,z,height:voxelHeight(x,z),moved:Math.hypot(x-position.x,z-position.z)>.00001};
}
export function inputFromKeys(keys){return {forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),right:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),fast:keys.has('ShiftLeft')||keys.has('ShiftRight')};}
/** Exposed faces only; avoids tens of thousands of separate ground boxes/draw calls. */
export function buildVoxelTerrain(bounds=TERRAIN_BOUNDS){
 const positions=[],colours=[],normals=[];
 function face(points,normal,c){for(const i of [0,1,2,0,2,3]){positions.push(...points[i]);normals.push(...normal);colours.push(...c);}}
 const hash=(x,z)=>{let n=Math.imul(Math.floor(x/CELL),374761393)^Math.imul(Math.floor(z/CELL),668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
 for(let x=bounds.minX;x<bounds.maxX;x+=CELL)for(let z=bounds.minZ;z<bounds.maxZ;z+=CELL){
  const s=surfaceAt(x+.5*CELL,z+.5*CELL),y=s.ground,h=CELL/2,cx=s.x,cz=s.z;
  const sand=cz<-23&&y<3.6,wet=Math.abs(cx-riverCentre(cz))<riverEdge(cz)+2;
  const noise=hash(cx,cz)-.5;
  const rgb=sand?[.77,.73,.51]:wet?[.32,.43,.28]:[.34,.49,.23];
  const adjacent=[[CELL,0],[-CELL,0],[0,CELL],[0,-CELL]].filter(([dx,dz])=>surfaceAt(cx+dx,cz+dz).ground>y+.1).length;
  const c=rgb.map(v=>linear(clamp(v+noise*.025,0,1))*(1-adjacent*.045));
  const point=(a,b,yy=y)=>[cx+a*h,yy,cz+b*h];
  face([point(-1,-1),point(-1,1),point(1,1),point(1,-1)],[0,1,0],c);
  for(const [dx,dz,n,edge] of [[1,0,[1,0,0],[[1,-1],[1,1]]],[-1,0,[-1,0,0],[[-1,1],[-1,-1]]],[0,1,[0,0,1],[[1,1],[-1,1]]],[0,-1,[0,0,-1],[[-1,-1],[1,-1]]]]){
   const neighbour=surfaceAt(cx+dx*CELL,cz+dz*CELL).ground;
   const bottom=Math.max(y-8,neighbour);if(bottom>=y-.001)continue;
   const [a,b]=edge;face([point(...a,y),point(...b,y),point(...b,bottom),point(...a,bottom)],n,(sand?[.57,.50,.33]:wet?[.30,.33,.23]:[.42,.36,.24]).map(v=>linear(v)));
  }
 }
 return {positions:new Float32Array(positions),colours:new Float32Array(colours),normals:new Float32Array(normals)};
}

/** Terrain-aware view selection for the species finder, so banks cannot hide its target. */
export function clearSight(from,target,obstacles=[]){
 for(const o of obstacles){let low=0,high=1;for(const [a,b,min,max] of [[from.x,target.x,o.x-o.hx,o.x+o.hx],[from.z,target.z,o.z-o.hz,o.z+o.hz],[from.y,target.y,o.bottom,o.top]]){
   const d=b-a;if(Math.abs(d)<1e-8){if(a<min||a>max){low=2;break;}}else{const t0=(min-a)/d,t1=(max-a)/d;low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1));}
  }if(low<high&&high>.015&&low<.98)return false;
 }

 for(let i=1;i<28;i++){const t=i/28,x=from.x+(target.x-from.x)*t,z=from.z+(target.z-from.z)*t,y=from.y+(target.y-from.y)*t;if(voxelHeight(x,z)>y+.12)return false;}return true;
}
export function observationPoint(from,target,obstacles=[]){
 if(clearSight(from,target,obstacles))return from;
 const original=Math.atan2(from.x-target.x,from.z-target.z);
 for(const r of [4,3,5,6])for(const angle of [0,.5,-.5,1,-1,1.6,-1.6,Math.PI]){
  const a=original+angle,x=target.x+Math.sin(a)*r,z=target.z+Math.cos(a)*r,h=voxelHeight(x,z),p={x,z,y:h+EYE};
  if(canStand(x,z,h,obstacles)&&clearSight(p,target,obstacles))return p;
 }
 return from;
}
