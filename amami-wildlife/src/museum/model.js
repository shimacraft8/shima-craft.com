/**
 * Pure maths, land shape and the placement plan of the 360° forest.
 *
 * Nothing here touches the DOM, three.js or the network, so every number below can be
 * checked by `node --test`. The renderer only uploads what these functions return.
 *
 * World axes: +X east, -Z north (out to sea), +Y up. Sea level is y = 0.
 * A yaw of 0 looks north; yaw grows clockwise, so the heading vector is
 * (sin yaw, 0, -cos yaw).
 */

/* ---------- numbers ---------- */
export const TAU=Math.PI*2;
export const clamp01=value=>value<0?0:value>1?1:value;
export const clamp=(value,low,high)=>value<low?low:value>high?high:value;
export const rad=degrees=>degrees*Math.PI/180;
export function mix(a,b,t){return a+(b-a)*t;}
export function smoothstep(edge0,edge1,x){
 const span=edge1-edge0;if(!span)return x<edge0?0:1;
 const t=clamp01((x-edge0)/span);return t*t*(3-2*t);
}
export function easeCamera(t){return t*t*(3-2*t);}
/** Shortest signed turn, so the camera never spins the long way round. */
export function wrapAngle(angle){let v=(angle+Math.PI)%TAU;if(v<0)v+=TAU;return v-Math.PI;}
/** Heading from one ground position to another, in the same convention as the camera yaw. */
export function yawTo(fromX,fromZ,toX,toZ){return Math.atan2(toX-fromX,fromZ-toZ);}

/* ---------- editorial grouping, kept for the catalogue build and the old share links ---------- */
export const PAGE_SIZE=3;
export const GROUP_SLUGS={哺乳類:'mammals',鳥類:'birds',爬虫類:'reptiles',両生類:'amphibians',昆虫:'insects'};
export function roomsFromSpecies(species){
 const groups=new Map();
 for(const entry of species){if(!groups.has(entry.group))groups.set(entry.group,[]);groups.get(entry.group).push(entry);}
 return [...groups].map(([group,entries],i)=>({id:`room-${i+1}`,index:i+1,group,entries}));
}
export function exhibitionPage(room,page){return room.entries.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);}
export function clampPage(room,page){if(!Number.isInteger(page))page=0;return Math.max(0,Math.min(Math.ceil(room.entries.length/PAGE_SIZE)-1,page));}
export function safeRoom(value,count){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=count?n:0;}

/* ---------- the land ----------
 * One height field for the whole world: forest valley, a stream that falls over a step,
 * an estuary, the open sea to the north and a ring of ridges everywhere else. Because the
 * ground is a single function of (x, z) there are no seams between "scenes" and no
 * direction you can look in that has nothing in it.
 */
export const SEA_LEVEL=0;
export const CENTRE_X=9,CENTRE_Z=-4;
export const LAND_RADIUS=540;
/** The stream meanders, so no view down the valley is a straight corridor. */
export function riverCentre(z){return Math.sin(z*.034)*6.4+Math.sin(z*.0115+1.3)*4.6;}
/** Height of the valley floor along the stream: sea, beach, the fall, the valley, the ridge. */
export function valleyFloor(z){
 return -4.6+smoothstep(-132,-33,z)*4.6
  +smoothstep(-33,-4,z)*2.4
  +smoothstep(1,7.5,z)*7.6
  +smoothstep(7.5,50,z)*8.4
  +smoothstep(50,150,z)*38;
}
export function channelWidth(z){return mix(mix(15,4.4,smoothstep(-30,-8,z)),2.8,smoothstep(10,34,z));}
export function channelDepth(z){return mix(2,1.2,smoothstep(-4,28,z))*smoothstep(-46,-30,z);}
/** Gentle undulation; flattened inside the channel so the stream bed stays a bed. */
export function relief(x,z){return Math.sin(x*.21+z*.13)*.42+Math.cos(x*.088-z*.17)*.55+Math.sin(x*.52-z*.41)*.13;}
/** Canopy shade baked into the ground instead of a real-time shadow pass. */
export function dapple(x,z){return .5+.5*Math.sin(x*.31+z*.17)*Math.cos(x*.12-z*.29);}
function bump(x,z,cx,cz,height,radius){
 const k=1-(((x-cx)**2+(z-cz)**2)/(radius*radius));
 return k<=0?0:height*k*k;
}
/** Distant ridges close the horizon in every direction except the bay to the north. */
export function horizonRidge(x,z){
 const dx=x-CENTRE_X,dz=z-CENTRE_Z,r=Math.hypot(dx,dz);
 if(r<90)return 0;
 const angle=Math.atan2(dx,-dz);
 const seaward=1-smoothstep(.62,1.25,Math.abs(angle));
 const ridge=28+Math.sin(angle*2.3+.7)*13+Math.sin(angle*5.1+2.2)*7+Math.sin(r*.012)*5;
 return smoothstep(90,230,r)*ridge*(1-seaward);
}
export function channelMask(x,z){
 const r=Math.min(1,Math.abs(x-riverCentre(z))/channelWidth(z));
 const k=1-r*r;return k*k;
}
export function terrainHeight(x,z){
 const d=Math.abs(x-riverCentre(z));
 const mask=channelMask(x,z);
 const inland=smoothstep(-26,-2,z);
 const walls=(smoothstep(7,36,d)*9+smoothstep(40,90,d)*10)*inland+smoothstep(2,10,d)*.6;
 const coastal=(smoothstep(12,40,x)*6+smoothstep(16,50,-x)*4)*(1-inland);
 return valleyFloor(z)+walls+coastal+horizonRidge(x,z)
  +bump(x,z,-120,-250,28,62)+bump(x,z,95,-330,18,46)
  +relief(x,z)*(1-mask)-channelDepth(z)*mask;
}
/** Half-width of the water surface: where the carved bed is deeper than the water level. */
export function riverEdge(z){return channelWidth(z)*.619;}
export function riverSurface(z){return Math.max(SEA_LEVEL+.035,valleyFloor(z)-channelDepth(z)*.38);}
/** 0 away from the fall, 1 on the face of it: used for whitewater and for the spray. */
export function fallIntensity(z){return smoothstep(-1.5,2.2,z)*(1-smoothstep(6.4,9.6,z));}
export const FALL_BASE_Z=.8,FALL_TOP_Z=8;
/** True where a point stands on dry, walkable ground above the water. */
export function onLand(x,z){
 const y=terrainHeight(x,z);
 if(y<=SEA_LEVEL+.25)return false;
 return y>riverSurface(z)+.12||Math.abs(x-riverCentre(z))>riverEdge(z)+.6;
}

/* ---------- colour of the ground ---------- */
const linear=channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4;
const tone=hex=>[0,2,4].map(i=>linear(parseInt(hex.slice(1+i,3+i),16)/255));
const blend=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
export const PALETTE={
 soil:tone('#7c6a46'),moss:tone('#3d5c34'),litter:tone('#6d5a37'),wet:tone('#4d5e4b'),
 sand:tone('#cfbf98'),shallow:tone('#74b3ac'),deep:tone('#1c4a5e'),rock:tone('#6b7159'),
 canopy:tone('#2f4a2b'),foam:tone('#eef3ee')
};
export function groundColour(x,z,y){
 const d=Math.abs(x-riverCentre(z)),w=channelWidth(z);
 const coast=1-smoothstep(-26,-4,z);
 let c=blend(PALETTE.soil,PALETTE.moss,smoothstep(1.6,7,d));
 c=blend(c,PALETTE.litter,smoothstep(9,22,d)*.5);
 c=blend(c,PALETTE.canopy,smoothstep(26,70,d)*.55);
 c=blend(c,PALETTE.wet,smoothstep(w*1.5,w*.6,d)*.85);
 c=blend(c,PALETTE.sand,Math.max(coast*smoothstep(2.6,.7,y),smoothstep(w*2.1,w*.9,d)*coast*.9));
 if(y<SEA_LEVEL+.3)c=blend(c,PALETTE.deep,smoothstep(.3,-3.2,y)*.92);
 const light=.84+dapple(x,z)*.3-smoothstep(12,46,d)*.1;
 return [c[0]*light,c[1]*light,c[2]*light];
}

/* ---------- grids ----------
 * Every surface in this world is a height field, so the winding rule is the same for all
 * of them: with vertices stored at a = i*(nj+1)+j, the face normal is
 * (dP/dj) x (dP/di), which must point up. A down-facing ground is a bug, not a style.
 */
export function gridIndices(ni,nj){
 const indices=new Uint32Array(ni*nj*6);
 let at=0;
 for(let i=0;i<ni;i++)for(let j=0;j<nj;j++){
  const a=i*(nj+1)+j,b=a+nj+1;
  indices[at++]=a;indices[at++]=a+1;indices[at++]=b+1;
  indices[at++]=a;indices[at++]=b+1;indices[at++]=b;
 }
 return indices;
}
/**
 * The ground: a polar grid around the viewpoints. Radial spacing grows with distance,
 * so detail sits where people stand (55 cm at the centre, 1.6 m at 40 m, 15 m at the rim)
 * without a second mesh, a seam or a level-of-detail pop.
 */
export function buildTerrain({rings=120,sectors=160,radius=LAND_RADIUS}={}){
 const growth=Math.log(radius/20+1)/rings;
 const positions=new Float32Array((rings+1)*(sectors+1)*3);
 const colours=new Float32Array((rings+1)*(sectors+1)*3);
 const uvs=new Float32Array((rings+1)*(sectors+1)*2);
 let at=0,uvAt=0;
 for(let i=0;i<=rings;i++){
  const r=20*(Math.exp(i*growth)-1);
  for(let j=0;j<=sectors;j++){
   const angle=j/sectors*TAU;
   const x=CENTRE_X+Math.sin(angle)*r,z=CENTRE_Z-Math.cos(angle)*r;
   const y=terrainHeight(x,z),colour=groundColour(x,z,y);
   positions[at]=x;positions[at+1]=y;positions[at+2]=z;
   colours[at]=colour[0];colours[at+1]=colour[1];colours[at+2]=colour[2];
   uvs[uvAt]=x*.07;uvs[uvAt+1]=z*.07;
   at+=3;uvAt+=2;
  }
 }
 return {positions,colours,uvs,indices:gridIndices(rings,sectors),rings,sectors};
}
/**
 * The stream, the fall and the estuary as one ribbon. i runs downstream (z falling) and
 * j runs east, which is the winding the rule above asks for.
 */
export function buildRiver({from=46,to=-34,lanes=7}={}){
 const steps=[];
 for(let z=from;z>to;z-=fallIntensity(z)>.05?.5:1.6)steps.push(z);
 steps.push(to);
 const count=steps.length;
 const positions=new Float32Array(count*(lanes+1)*3);
 const colours=new Float32Array(count*(lanes+1)*3);
 const uvs=new Float32Array(count*(lanes+1)*2);
 let at=0,uvAt=0,run=0;
 for(let i=0;i<count;i++){
  const z=steps[i],centre=riverCentre(z),half=riverEdge(z)*1.04,y=riverSurface(z);
  if(i)run+=Math.hypot(z-steps[i-1],y-riverSurface(steps[i-1]));
  const foam=Math.max(fallIntensity(z),smoothstep(-24,-33,z)*.5);
  for(let j=0;j<=lanes;j++){
   const u=(j/lanes-.5)*2*half;
   const edge=smoothstep(.55,1,Math.abs(u)/half)*.45;
   const colour=blend(blend(PALETTE.shallow,PALETTE.deep,.3),PALETTE.foam,Math.min(1,foam+edge));
   positions[at]=centre+u;positions[at+1]=y;positions[at+2]=z;
   colours[at]=colour[0];colours[at+1]=colour[1];colours[at+2]=colour[2];
   uvs[uvAt]=j/lanes*1.6;uvs[uvAt+1]=run*.22;
   at+=3;uvAt+=2;
  }
 }
 return {positions,colours,uvs,indices:gridIndices(count-1,lanes),steps:count,lanes};
}
/** The sea: a flat polar disc. Land above sea level simply occludes it. */
export function buildSea({rings=34,sectors=96,radius=1500}={}){
 const growth=Math.log(radius/18+1)/rings;
 const positions=new Float32Array((rings+1)*(sectors+1)*3);
 const colours=new Float32Array((rings+1)*(sectors+1)*3);
 const uvs=new Float32Array((rings+1)*(sectors+1)*2);
 let at=0,uvAt=0;
 for(let i=0;i<=rings;i++){
  const r=18*(Math.exp(i*growth)-1);
  for(let j=0;j<=sectors;j++){
   const angle=j/sectors*TAU;
   const x=CENTRE_X+Math.sin(angle)*r,z=CENTRE_Z-Math.cos(angle)*r;
   const floor=terrainHeight(x,z);
   const shade=blend(PALETTE.shallow,PALETTE.deep,smoothstep(-.4,-4.5,floor));
   const colour=blend(shade,PALETTE.foam,smoothstep(-.15,.4,floor)*.7);
   positions[at]=x;positions[at+1]=SEA_LEVEL;positions[at+2]=z;
   colours[at]=colour[0];colours[at+1]=colour[1];colours[at+2]=colour[2];
   uvs[uvAt]=x*.02;uvs[uvAt+1]=z*.02;
   at+=3;uvAt+=2;
  }
 }
 return {positions,colours,uvs,indices:gridIndices(rings,sectors),rings,sectors};
}

/* ---------- where you can stand ----------
 * Seven places on the ground, linked like a walk rather than like a menu. Each one is a
 * real spot in the one height field above; the eye height is added to the ground there.
 */
export const VIEWPOINTS=[
 {id:'hego',name:'ヒカゲヘゴの林',sub:'谷を見おろす斜面',x:16.9,z:22,eye:1.62,yaw:rad(-20),links:['floor','falls']},
 {id:'floor',name:'林床の木かげ',sub:'大木の板根と落ち葉',x:1.4,z:34,eye:1.58,yaw:rad(170),links:['hego','falls']},
 {id:'falls',name:'滝の下の岩場',sub:'しぶきと濡れた岩',x:15,z:-5,eye:1.6,yaw:rad(-130),links:['hego','stream','floor']},
 {id:'stream',name:'渓流のほとり',sub:'浅瀬と倒木',x:7.1,z:-8,eye:1.56,yaw:rad(-168),links:['falls','estuary']},
 {id:'estuary',name:'河口のひがた',sub:'汽水と干潟',x:-12,z:-25,eye:1.58,yaw:rad(31),links:['stream','shore','cape']},
 {id:'cape',name:'海を見おろす林縁',sub:'海に迫る森',x:26,z:-20,eye:1.6,yaw:rad(-36),links:['estuary','shore']},
 {id:'shore',name:'海べの砂地',sub:'波打ちぎわ',x:14,z:-32,eye:1.56,yaw:rad(4),links:['cape','estuary']}
];
export const viewpointIndex=id=>VIEWPOINTS.findIndex(spot=>spot.id===id);
/** Landmarks named for the status line, so "which way is the sea" is answerable in text. */
export const LANDMARKS=[
 {name:'海',x:-10,z:-240},{name:'滝',x:riverCentre(4.4),z:4.4},
 {name:'川',x:riverCentre(-14),z:-14},{name:'山の尾根',x:14,z:210},{name:'河口',x:riverCentre(-28),z:-28}
];
export function nearestLandmark(x,z,yaw){
 let best=null,bestTurn=Infinity;
 for(const mark of LANDMARKS){
  const turn=Math.abs(wrapAngle(yawTo(x,z,mark.x,mark.z)-yaw));
  if(turn<bestTurn){bestTurn=turn;best=mark;}
 }
 return bestTurn<.7?best:null;
}

/* ---------- who lives where ----------
 * Placement is by habit, not by taxonomy: no viewpoint is a room full of one class.
 * `size` is the drawn height in metres and is deliberately not to scale - a 5 mm ant has
 * to be findable - which the on-screen note says in plain words.
 */
export const PLACEMENT={
 /* 斜面の照葉樹林とヒカゲヘゴ */
 'amami-rabbit':{spot:'hego',perch:'ground',az:24,dist:5.2,size:.9},
 'lidths-jay':{spot:'hego',perch:'branch',az:-34,dist:7.5,size:.62},
 'amami-stag':{spot:'hego',perch:'trunk',az:-82,dist:4.6,size:.5},
 'okinawa-peacock':{spot:'hego',perch:'leaf',az:66,dist:3.4,size:.42},
 'green-snake':{spot:'hego',perch:'branch',az:140,dist:6.2,size:1.1},
 'orii-shrew':{spot:'hego',perch:'ground',az:-150,dist:4.2,size:.4},
 /* 暗い林床 */
 'amami-spiny-rat':{spot:'floor',perch:'ground',az:150,dist:4,size:.5},
 'tokunoshima-spiny-rat':{spot:'floor',perch:'ground',az:-168,dist:5.6,size:.5},
 'amami-woodcock':{spot:'floor',perch:'ground',az:120,dist:6.4,size:.6},
 'amami-dung-beetle':{spot:'floor',perch:'ground',az:-126,dist:3,size:.34},
 'broad-grooved-stag':{spot:'floor',perch:'trunk',az:-40,dist:4.4,size:.46},
 'ryukyu-scops-owl':{spot:'floor',perch:'branch',az:42,dist:7,size:.52},
 /* 滝とその飛沫 */
 'amami-ishikawa-frog':{spot:'falls',perch:'rock',az:-160,dist:5,size:.5},
 'amami-tip-nosed-frog':{spot:'falls',perch:'water',az:-128,dist:6.4,size:.44},
 himehabu:{spot:'falls',perch:'rock',az:-104,dist:4.2,size:1.1},
 'ruddy-kingfisher':{spot:'falls',perch:'branch',az:-176,dist:8.5,size:.5},
 'amami-mountain-stag':{spot:'falls',perch:'trunk',az:56,dist:4,size:.46},
 'amami-crocodile-newt':{spot:'falls',perch:'ground',az:118,dist:3.2,size:.5},
 /* 渓流 */
 'otton-frog':{spot:'stream',perch:'water',az:-150,dist:4.6,size:.56},
 habu:{spot:'stream',perch:'rock',az:-40,dist:5.4,size:1.6},
 'banded-gecko':{spot:'stream',perch:'trunk',az:30,dist:3.6,size:.5},
 'uke-stag':{spot:'stream',perch:'trunk',az:96,dist:4.2,size:.46},
 'ryukyu-robin':{spot:'stream',perch:'ground',az:150,dist:4,size:.42},
 'blue-tiger':{spot:'stream',perch:'leaf',az:-92,dist:3.2,size:.44},
 /* 河口 */
 akamata:{spot:'estuary',perch:'ground',az:96,dist:5,size:1.5},
 'grey-faced-buzzard':{spot:'estuary',perch:'branch',az:150,dist:9,size:.84},
 'pale-thrush':{spot:'estuary',perch:'ground',az:56,dist:4.4,size:.46},
 'long-haired-rat':{spot:'estuary',perch:'ground',az:-46,dist:4,size:.56},
 'camponotus-amamianus':{spot:'estuary',perch:'ground',az:-112,dist:2.8,size:.3},
 'winter-chafer':{spot:'estuary',perch:'leaf',az:-170,dist:3.4,size:.36},
 /* 海に迫る森 */
 'green-pigeon':{spot:'cape',perch:'canopy',az:120,dist:8,size:.56},
 'black-wood-pigeon':{spot:'cape',perch:'canopy',az:170,dist:9.5,size:.62},
 'orii-bat':{spot:'cape',perch:'branch',az:-120,dist:5.5,size:.46},
 'coral-snake':{spot:'cape',perch:'ground',az:60,dist:4.2,size:1},
 'amami-deer-stag':{spot:'cape',perch:'trunk',az:-84,dist:4,size:.46},
 /* 砂浜 */
 'green-turtle':{spot:'shore',perch:'sand',az:-28,dist:6.5,size:1.3},
 'loggerhead-turtle':{spot:'shore',perch:'sand',az:22,dist:8.5,size:1.25},
 'watase-shrew':{spot:'shore',perch:'ground',az:128,dist:4,size:.4},
 'ferrie-longhorn':{spot:'shore',perch:'trunk',az:160,dist:4.6,size:.42},
 'white-striped-chafer':{spot:'shore',perch:'leaf',az:96,dist:3.2,size:.36}
};
/** Height above its support at which each kind of animal is stood. */
export const PERCH_HEIGHT={ground:0,sand:0,rock:0,water:0,leaf:.95,trunk:1.35,branch:4.4,canopy:9.4};
export function planAnimals(species){
 const plan=[];
 for(const entry of species){
  const seat=PLACEMENT[entry.id];
  if(!seat||!entry.asset)continue;
  const index=viewpointIndex(seat.spot);
  if(index<0)continue;
  const spot=VIEWPOINTS[index],az=rad(seat.az);
  plan.push({id:entry.id,name:entry.name,group:entry.group,asset:entry.asset,
   spot:seat.spot,spotIndex:index,perch:seat.perch,size:seat.size,az,dist:seat.dist,
   x:spot.x+Math.sin(az)*seat.dist,z:spot.z-Math.cos(az)*seat.dist,
   lift:PERCH_HEIGHT[seat.perch]??0});
 }
 return plan;
}
/** Entries the plan cannot place: the catalogue must still reach them, so this is reported. */
export function unplacedSpecies(species){return species.filter(entry=>!PLACEMENT[entry.id]||!entry.asset).map(entry=>entry.id);}

/* ---------- old share links ---------- */
/**
 * ?exhibit, ?room, ?shelf and ?zone all used to address a shelf in an exhibition room.
 * Resolve each of them to a single species so the link still lands on something real.
 */
export function resolveLegacyTarget(params,species){
 const get=key=>params.get?params.get(key):params[key];
 const byId=id=>species.find(entry=>entry.id===id)??null;
 const exhibit=byId(get('exhibit'));
 if(exhibit)return {species:exhibit,open:true};
 const rooms=roomsFromSpecies(species);
 const zone=get('zone');
 let room=rooms.find(item=>GROUP_SLUGS[item.group]===zone)??null;
 if(!room){
  const index=safeRoom(String(get('room')??'').replace('room-',''),rooms.length);
  room=index?rooms[index-1]:null;
 }
 if(!room)return null;
 const shelf=Number(get('shelf'));
 const entry=Number.isInteger(shelf)&&shelf>0
  ? exhibitionPage(room,clampPage(room,shelf-1))[0]
  : room.entries[0];
 return entry?{species:entry,open:false}:null;
}
