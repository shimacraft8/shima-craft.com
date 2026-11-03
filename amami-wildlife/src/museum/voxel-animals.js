/** Original, photo-referenced block animals. All geometry is local; no billboard fallback. */
import * as THREE from 'three';
const FUR=['#413d36','#49443c','#514a40','#383832'];
export const VOXEL_PROFILES={
 'amami-rabbit':{kind:'rabbit'},
 'amami-spiny-rat':{kind:'rodent',fur:['#65563d','#756246','#594d38'],spines:true,tail:1.0},
 'tokunoshima-spiny-rat':{kind:'rodent',fur:['#665644','#78634d','#554938'],spines:true,tail:.8,small:true},
 'long-haired-rat':{kind:'rodent',fur:['#82705a','#94826a','#6b5e4c'],tail:1.5,whiteTip:true},
 'orii-shrew':{kind:'shrew',fur:['#786d59','#8c8067','#655b49'],tail:.7},
 'watase-shrew':{kind:'shrew',fur:['#76634e','#88745b','#63523f'],tail:.9},
 'orii-bat':{kind:'bat'},
 'lidths-jay':{kind:'bird',body:'#925f4c',head:'#364c83',wing:'#2b477d',tail:'#294471',bill:'#c8c6a0',mask:true,tailLength:.72},
 'amami-woodcock':{kind:'bird',body:'#6d5138',head:'#776044',wing:'#513f2e',tail:'#594533',bill:'#8a7059',longBill:true,mottle:true,tailLength:.25},
 'ryukyu-robin':{kind:'bird',body:'#83918b',head:'#a2a699',crown:'#bd873c',wing:'#b8762d',tail:'#a7682a',bill:'#3d4236',orangeBack:true,tailLength:.48},
 'ryukyu-scops-owl':{kind:'bird',body:'#82725c',head:'#8a7c68',wing:'#5b503f',tail:'#615741',bill:'#c3b794',owl:true,mottle:true,tailLength:.25},
 'black-wood-pigeon':{kind:'bird',body:'#283a3c',head:'#26393b',wing:'#203338',tail:'#1f2e34',bill:'#778581',pigeon:true,tailLength:.56},
 'green-pigeon':{kind:'bird',body:'#b1bd73',head:'#b7c09c',wing:'#758967',tail:'#7c8c68',bill:'#b3c0b3',pigeon:true,crown:'#8d6962',tailLength:.48},
 'grey-faced-buzzard':{kind:'bird',body:'#8b7456',head:'#80796b',wing:'#4d4436',tail:'#574b39',bill:'#8b8961',raptor:true,tailLength:.58},
 'pale-thrush':{kind:'bird',body:'#c2bda4',head:'#9b8a63',wing:'#8b7959',tail:'#75674c',bill:'#c6ad61',tailLength:.46},
 'ruddy-kingfisher':{kind:'bird',body:'#b36f62',head:'#a85f58',wing:'#914e53',tail:'#874a50',bill:'#c87658',kingfisher:true,tailLength:.38},
 'green-turtle':{kind:'turtle',shell:['#7b8148','#8b8d50','#a0a05f','#697642'],head:['#8a915d','#a2a576','#798550']},
 'loggerhead-turtle':{kind:'turtle',shell:['#986b46','#ac8054','#b89162','#805d3f'],head:['#b58d5e','#c5a16d','#9b7951'],loggerhead:true},
 'habu':{kind:'snake',body:'#b7b56c',dark:'#4c503b',head:'#a5a968',radius:.115,amplitude:.30,length:2.35,pattern:'diamonds',triangular:true},
 'himehabu':{kind:'snake',body:'#8b7d69',dark:'#4e463a',head:'#86765f',radius:.145,amplitude:.28,length:1.9,pattern:'diamonds',triangular:true},
 'coral-snake':{kind:'snake',body:'#b8854c',dark:'#302f2c',head:'#473e30',radius:.07,amplitude:.26,length:2.2,pattern:'rings'},
 'green-snake':{kind:'snake',body:'#7d9c50',dark:'#6d8946',head:'#88a55b',radius:.065,amplitude:.24,length:2.35,pattern:'plain'},
 'akamata':{kind:'snake',body:'#b79d64',dark:'#393e39',head:'#a5a279',radius:.115,amplitude:.30,length:2.4,pattern:'rings'},
 'banded-gecko':{kind:'gecko'},
 'amami-ishikawa-frog':{kind:'frog',body:['#699142','#829e4a','#556c33'],spots:'#334b31',belly:'#d6d4a9',wide:true},
 'otton-frog':{kind:'frog',body:['#856f4d','#9a8056','#715c40'],spots:'#584a36',belly:'#c0ab7b',wide:true,otton:true},
 'amami-tip-nosed-frog':{kind:'frog',body:['#85875c','#a0a276','#6f7751'],spots:'#5c6548',belly:'#dbd9b4',slender:true},
 'amami-crocodile-newt':{kind:'newt'},
 'camponotus-amamianus':{kind:'ant'},
 'amami-stag':{kind:'beetle',body:'#343a32',mandibles:.25,wide:true},
 'uke-stag':{kind:'beetle',body:'#303637',mandibles:.23,wide:true},
 'amami-deer-stag':{kind:'beetle',body:'#493e2f',mandibles:.44,slender:true},
 'amami-mountain-stag':{kind:'beetle',body:'#6b4939',mandibles:.50,mountain:true},
 'broad-grooved-stag':{kind:'beetle',body:'#4b4a39',mandibles:.43,grooves:true},
 'okinawa-peacock':{kind:'butterfly',body:'#253c3b',wing:'#233950',marks:'#426d9a',swallowtail:true},
 'blue-tiger':{kind:'butterfly',body:'#38463c',wing:'#384b3f',marks:'#b0d8c9'},
 'amami-dung-beetle':{kind:'beetle',body:'#343c39',dung:true,wide:true},
 'winter-chafer':{kind:'beetle',body:'#916245',head:'#574c37',chafer:true,hairy:true},
 'white-striped-chafer':{kind:'beetle',body:'#80684b',head:'#75624a',chafer:true,stripes:true},
 'ferrie-longhorn':{kind:'beetle',body:'#d0873e',head:'#c48039',longhorn:true}
};
export const VOXEL_IDS=Object.freeze(Object.keys(VOXEL_PROFILES));
export function createVoxelAnimal(id){
 const profile=VOXEL_PROFILES[id];if(!profile)return null;
 const group=new THREE.Group(),geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.88});group.name=id;
 const meshes=[],animations=[],parts=new Map(),paths=[],counts={legs:0,frontFlippers:0,rearFlippers:0,ears:0,tails:0,wings:0,antennae:0,mandibles:0};
 let part='body';const body=[];
 function block(list,x,y,z,sx,sy,sz,c,rz=0){list.push({x,y,z,sx,sy,sz,c,rz,part});}
 function named(name,fn){const previous=part;part=name;fn();part=previous;}
 function batch(list,parent=group){
  if(!list.length)return;
  const mesh=new THREE.InstancedMesh(geometry,material,list.length),o=new THREE.Object3D(),c=new THREE.Color();
  list.forEach((b,i)=>{o.position.set(b.x,b.y,b.z);o.scale.set(b.sx,b.sy,b.sz);o.rotation.set(0,0,b.rz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,c.set(b.c));
   if(parent===group){if(!parts.has(b.part))parts.set(b.part,new THREE.Box3());parts.get(b.part).union(new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(o.matrix));}
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);meshes.push(mesh);return mesh;
 }
 function ellipsoid(list,cx,cy,cz,rx,ry,rz,cell,palette){
  const inside=(x,y,z)=>((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2<=1;
  for(let ix=Math.floor((cx-rx)/cell);ix<=Math.ceil((cx+rx)/cell);ix++)for(let iy=Math.floor((cy-ry)/cell);iy<=Math.ceil((cy+ry)/cell);iy++)for(let iz=Math.floor((cz-rz)/cell);iz<=Math.ceil((cz+rz)/cell);iz++){
   const x=ix*cell,y=iy*cell,z=iz*cell;if(!inside(x,y,z))continue;
   if([[cell,0,0],[-cell,0,0],[0,cell,0],[0,-cell,0],[0,0,cell],[0,0,-cell]].every(([a,b,c])=>inside(x+a,y+b,z+c)))continue;
   const hash=Math.abs(Math.imul(ix,73)^Math.imul(iy,193)^Math.imul(iz,389));block(list,x,y,z,cell,cell,cell,palette[hash%palette.length]);
  }
 }
 // A chain of overlapping axis-aligned cuboids is continuous even at its bends.
 function chain(list,points,radii,colour,name){
  named(name,()=>{for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],r=Math.min(radii[i],radii[i+1]);block(list,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,Math.abs(a.x-b.x)+r*2,Math.abs(a.y-b.y)+r*2,Math.abs(a.z-b.z)+r*2,typeof colour==='function'?colour(i):colour);}});
  paths.push({name,points,radii});
 }
 function eyes(list,x,y,z,{colour='#1d2925',size=.045}={}){for(const s of [-1,1]){block(list,s*x,y,z,.025,size,size,colour);block(list,s*(x+.014),y+size*.16,z-size*.12,.008,size*.24,size*.24,'#ede8ce');}}
 function fourLegs(list,{x=.23,front=-.24,rear=.27,y=.18,h=.28,c='#62533e',toeCount=0}={}){
  for(const side of [-1,1])for(const back of [false,true]){const name=(back?'hind':'fore')+'-leg-'+side,z=back?rear:front;named(name,()=>{block(list,side*x,y,z,.12,h,.15,c);block(list,side*(x+.035),.045,z-.045,.19,.09,.25,c);for(let k=0;k<toeCount;k++)block(list,side*(x-.06+k*.045),.025,z-.19,.025,.035,.12,c);});counts.legs++;}
 }
 function tail(list,points,radii,c){counts.tails=1;chain(list,points,radii,c,'tail');}
 const p=profile;
 if(p.kind==='rabbit'){
  ellipsoid(body,0,.46,.13,.34,.34,.51,.1,FUR);named('head',()=>ellipsoid(body,0,.63,-.40,.26,.26,.26,.08,FUR));
  for(const side of [-1,1]){
   named('fore-leg-'+side,()=>{block(body,side*.18,.19,-.25,.12,.3,.14,'#413d36');block(body,side*.18,.06,-.31,.14,.12,.25,'#514a40');});
   named('hind-leg-'+side,()=>{ellipsoid(body,side*.18,.32,.40,.18,.23,.23,.08,FUR);block(body,side*.24,.07,.41,.18,.14,.40,'#49443c');});counts.legs+=2;
   named('ear-'+side,()=>{block(body,side*.15,.89,-.39,.12,.17,.11,'#413d36',side*-.10);block(body,side*.15,.89,-.45,.055,.085,.015,'#6e5e50',side*-.10);});counts.ears++;
  }
  eyes(body,.225,.68,-.50,{size:.07});block(body,0,.55,-.65,.14,.10,.13,'#5b5043');block(body,0,.58,-.723,.075,.05,.025,'#292d27');named('tail',()=>block(body,0,.34,.66,.14,.13,.16,'#3b3b33'));counts.tails=1;
 }else if(p.kind==='rodent'||p.kind==='shrew'){
  const shrew=p.kind==='shrew';ellipsoid(body,0,.31,.05,.25,.23,.44,.09,p.fur);
  named('head',()=>{ellipsoid(body,0,.33,-.39,.18,.17,.23,.07,p.fur);block(body,0,.28,-.59,.16,.11,.24,p.fur[1]);block(body,0,.28,-.73,shrew?.065:.10,.065,.09,'#3c3c32');});
  fourLegs(body,{x:.17,front:-.22,rear:.27,y:.13,h:.19,c:p.fur[0]});
  for(const s of [-1,1]){named('ear-'+s,()=>{block(body,s*.15,.49,-.32,shrew?.09:.14,shrew?.12:.18,.09,p.fur[1]);block(body,s*.15,.49,-.374,shrew?.045:.08,.08,.025,'#a28b72');});counts.ears++;}
  eyes(body,.17,.38,-.49,{size:shrew?.035:.05});
  if(p.spines)for(let k=0;k<12;k++)block(body,Math.sin(k*2.4)*.19,.48+Math.cos(k)*.025,-.05+(k%4)*.12,.025,.16,.025,p.fur[k%3],Math.sin(k)*.15);
  const pts=Array.from({length:16},(_,i)=>{const t=i/15;return{x:Math.sin(t*2.5)*.22,y:.14+Math.sin(t*Math.PI)*.12,z:.40+t*p.tail};});tail(body,pts,pts.map((_,i)=>.043-i*.0018),i=>p.whiteTip&&i>10?'#d3ccaf':'#746454');
 }else if(p.kind==='bird'){
  const owl=!!p.owl,woodcock=!!p.longBill;
  ellipsoid(body,0,.51,.06,owl?.24:.20,owl?.35:.29,woodcock?.38:.30,.085,[p.body,p.body,p.wing]);
  named('head',()=>ellipsoid(body,0,owl?.84:.83,owl?-.11:-.20,owl?.23:.17,owl?.22:.18,owl?.20:.18,.065,[p.head]));
  if(p.mask)for(const s of [-1,1])block(body,s*.143,.85,-.24,.07,.13,.22,'#222e41');
  if(p.crown)block(body,0,.975,-.18,.20,.07,.20,p.crown);
  if(p.orangeBack){block(body,0,.81,.02,.24,.31,.20,'#bd7d31');block(body,0,.95,-.14,.20,.07,.24,'#c58b42');}
  for(const s of [-1,1]){
   named('wing-'+s,()=>{block(body,s*.182,.52,.11,.12,.35,.37,p.wing,s*-.12);for(let k=0;k<3;k++)block(body,s*.197,.38+k*.055,.24-k*.09,.10,.06,.22,p.tail);});counts.wings++;
   named('leg-'+s,()=>{const c=p.raptor?'#ba9d56':'#78735c';block(body,s*.10,.17,-.01,.045,.26,.045,c);for(let toe=0;toe<(owl?2:3);toe++)block(body,s*.10+(toe-1)*.034,.034,-.09,.026,.045,.17,c);for(let toe=0;toe<(owl?2:1);toe++)block(body,s*.10+toe*.035,.034,.07,.03,.045,.1,c);});counts.legs++;
  }
  if(owl){for(const s of [-1,1]){block(body,s*.14,1.08,-.08,.10,.18,.10,p.head,s*-.2);block(body,s*.11,.87,-.295,.13,.14,.035,'#c9c296');block(body,s*.11,.875,-.32,.075,.08,.025,'#d4c16a');block(body,s*.11,.875,-.338,.032,.052,.015,'#243028');}block(body,0,.77,-.31,.06,.12,.08,p.bill);}
  else {eyes(body,.155,.86,-.26,{size:.045});const length=woodcock?.53:p.kingfisher?.37:p.raptor?.16:.18;block(body,0,.79,-.34-length/2,.085,woodcock?.06:.09,length,p.bill);if(p.raptor)block(body,0,.75,-.45,.065,.11,.06,'#4f5040');}
  named('tail',()=>{block(body,0,.36,.35+p.tailLength/2,.17,.075,p.tailLength,p.tail);for(const s of [-1,1])block(body,s*.09,.36,.35+p.tailLength*.45,.045,.07,p.tailLength*.9,p.wing);});counts.tails=1;
  if(p.raptor)for(let k=0;k<5;k++)block(body,0,.35+k*.08,-.18,.24,.027,.035,'#c6b995');
  if(p.mottle)for(let k=0;k<22;k++)block(body,Math.sin(k*2.4)*.19,.37+(k%5)*.09,-.19+Math.cos(k)*.035,.055,.035,.05,k%2?'#b8a483':'#403b30');
 }else if(p.kind==='turtle'){
  const shell=p.shell,head=p.head;ellipsoid(body,0,.30,.04,.43,.18,.59,.095,shell);ellipsoid(body,0,.17,.04,.36,.065,.51,.08,['#d5ca8d','#c3bb7e']);
  for(let i=0;i<5;i++){const z=-.36+i*.2,y=.30+.18*Math.sqrt(Math.max(0,1-(z/.65)**2));block(body,0,y+.025,z,.17,.035,.17,i%2?shell[2]:shell[1]);}
  for(const s of [-1,1])for(let i=0;i<(p.loggerhead?5:4);i++){const z=-.31+i*(p.loggerhead?.16:.20),y=.30+.18*Math.sqrt(Math.max(0,1-(z/.64)**2-(.24/.48)**2));block(body,s*.24,y+.035,z,.16,.035,.14,i%2?shell[2]:shell[1]);}
  named('head',()=>{block(body,0,.25,-.59,.18,.16,.27,head[0]);ellipsoid(body,0,.27,-.79,p.loggerhead?.205:.15,p.loggerhead?.15:.13,.18,.055,head);block(body,0,.228,-.963,p.loggerhead?.22:.15,.055,.035,'#d1c895');});eyes(body,p.loggerhead?.18:.133,.31,-.843,{size:.052});
  tail(body,[{x:0,y:.19,z:.56},{x:0,y:.19,z:.70},{x:0,y:.19,z:.80}],[.05,.035,.018],head[0]);
  batch(body);
  for(const s of [-1,1])for(const front of [true,false]){
   const fin=new THREE.Group();fin.name=(front?'front':'rear')+'-flipper-'+(s<0?'left':'right');fin.position.set(s*(front?.34:.27),.20,front?-.31:.43);group.add(fin);const blocks=[];
   if(front){block(blocks,s*.17,0,.05,.40,.075,.25,head[2]);block(blocks,s*.45,0,.15,.30,.065,.19,head[0]);block(blocks,s*.64,0,.25,.18,.05,.12,head[1]);counts.frontFlippers++;for(let i=0;i<4;i++)block(blocks,s*(.10+i*.12),.041,.04+i*.035,.055,.012,.055,'#b4b883');}
   else{block(blocks,s*.07,0,.07,.22,.06,.24,head[0]);block(blocks,s*.18,0,.21,.20,.055,.19,head[1]);block(blocks,s*.23,0,.31,.13,.045,.10,head[1]);counts.rearFlippers++;}
   batch(blocks,fin);animations.push({node:fin,axis:'z',amplitude:s*(front?.23:.11),speed:front?1.2:.9});
  }
 }else if(p.kind==='snake'){
  const points=Array.from({length:44},(_,i)=>{const t=i/43;return{x:Math.sin(t*Math.PI*2.2)*p.amplitude,y:p.radius+.02,z:-.86+t*p.length};});const radii=points.map((_,i)=>p.radius*(i<29?1:Math.max(.13,1-(i-29)/15)));
  chain(body,points,radii,i=>p.pattern==='rings'&&i%7<3?p.dark:p.body,'body');
  named('head',()=>{ellipsoid(body,0,p.radius+.03,-.98,p.triangular?p.radius*1.7:p.radius*1.13,p.radius*.85,.22,.055,[p.head]);block(body,0,.065,-1.05,p.radius*1.8,.035,.20,'#d3c899');});
  eyes(body,p.triangular?p.radius*1.4:p.radius,p.radius+.035,-1.05,{colour:'#243127',size:.035});
  if(p.pattern==='diamonds')for(let i=3;i<31;i+=5){const a=points[i];block(body,a.x,a.y+p.radius+.012,a.z,p.radius*1.5,.025,.15,p.dark,.18);}
  // The final tapered portion belongs to the same single centreline, never a second tail.
  counts.tails=1;paths[0].name='single-body-head-to-tail';
 }else if(p.kind==='frog'){
  ellipsoid(body,0,.25,.08,p.slender?.23:.33,.22,p.slender?.37:.33,.085,p.body);block(body,0,.16,-.16,.38,.16,.17,p.belly);
  named('head',()=>ellipsoid(body,0,.32,-.22,p.slender?.22:.30,.17,.22,.07,p.body));
  for(const s of [-1,1]){block(body,s*.20,.48,-.26,.11,.10,.10,p.body[1]);block(body,s*.238,.48,-.30,.04,.07,.07,'#a58d4f');block(body,s*.26,.48,-.315,.012,.055,.02,'#182a24');
   named('fore-leg-'+s,()=>{chain(body,[{x:s*.22,y:.24,z:-.12},{x:s*.37,y:.11,z:-.21},{x:s*.30,y:.045,z:-.42}],[.07,.06,.04],p.body[0],'fore-leg-'+s);for(let k=0;k<(p.otton?5:4);k++)block(body,s*(.22+k*.045),.03,-.49,.025,.04,.18,p.belly);});
   named('hind-leg-'+s,()=>{ellipsoid(body,s*.34,.20,.25,.17,.15,.22,.07,p.body);chain(body,[{x:s*.36,y:.15,z:.36},{x:s*.50,y:.07,z:.08},{x:s*.48,y:.04,z:.44}],[.08,.065,.04],p.body[0],'hind-leg-'+s);for(let k=0;k<5;k++)block(body,s*(.40+k*.045),.025,.51,.025,.035,.19,p.body[1]);});counts.legs+=2;
  }
  for(let k=0;k<26;k++)block(body,Math.sin(k*2.4)*(p.slender?.19:.26),.42+Math.cos(k)*.025,-.16+(k%5)*.11,.055,.03,.06,p.spots);
 }else if(p.kind==='gecko'||p.kind==='newt'){
  const gecko=p.kind==='gecko',col=gecko?['#baa49d','#7d685e','#d7c1b0']:['#393c32','#4d4d3f','#30382f'];ellipsoid(body,0,.20,.02,.18,.14,.44,.07,col);
  named('head',()=>ellipsoid(body,0,.22,-.42,.23,.15,.23,.065,col));
  for(const s of [-1,1])for(const back of [false,true]){const z=back?.26:-.23,name=(back?'hind':'fore')+'-leg-'+s;
   chain(body,[{x:s*.13,y:.20,z},{x:s*.31,y:.10,z:z+(back?.10:-.04)},{x:s*.37,y:.035,z:z+(back?.05:-.16)}],[.055,.05,.035],col[0],name);
   named(name,()=>{for(let k=0;k<(gecko||back?5:4);k++)block(body,s*(.28+k*.035),.025,z+(back?.01:-.22),.022,.03,.13,col[1]);});counts.legs++;
  }
  const pts=Array.from({length:17},(_,i)=>{const t=i/16;return{x:Math.sin(t*2)*.22,y:.14-t*.05,z:.40+t*.95};});tail(body,pts,pts.map((_,i)=>.13*(1-i/18)),i=>gecko?(i%6<3?'#363d3d':'#d4d5cc'):col[1]);
  if(gecko){for(const z of [-.34,-.04,.26])block(body,0,.31,z,.32,.08,.10,'#4e463e');eyes(body,.21,.28,-.49,{colour:'#a37d42',size:.08});for(const s of [-1,1])block(body,s*.225,.28,-.50,.008,.065,.013,'#1c2723');}
  else{eyes(body,.19,.29,-.51,{size:.035});for(let i=0;i<7;i++){block(body,0,.35,-.25+i*.10,.055,.08,.055,'#776854');for(const s of [-1,1])block(body,s*.15,.29,-.21+i*.1,.07,.065,.06,'#957449');}}
 }else if(p.kind==='bat'){
  ellipsoid(body,0,.37,0,.16,.26,.15,.07,['#827363','#a38a76','#685e53']);named('head',()=>ellipsoid(body,0,.62,-.02,.14,.16,.14,.05,['#a38c78','#8c7463']));
  for(const s of [-1,1]){named('ear-'+s,()=>block(body,s*.12,.82,-.01,.10,.23,.07,'#9c8571',s*-.2));counts.ears++;
   named('hind-leg-'+s,()=>{block(body,s*.10,.09,.01,.04,.20,.05,'#5f554c');block(body,s*.10,.01,-.03,.07,.04,.10,'#776754');});counts.legs++;
   const wing=new THREE.Group();wing.name='wing-'+s;wing.position.set(s*.1,.46,0);group.add(wing);const wb=[];for(let i=0;i<9;i++){const t=i/8;block(wb,s*(.05+t*.83),-.02-t*.1,0,.13,.06,.57*(1-t)+.12,'#5c5050');block(wb,s*(.05+t*.83),.02-t*.1,-.23+t*.18,.14,.05,.055,'#a58a76');}batch(wb,wing);animations.push({node:wing,axis:'z',amplitude:s*.18,speed:2});counts.wings++;
  }
  block(body,0,.60,-.16,.12,.12,.055,'#b29b84');block(body,0,.62,-.196,.06,.05,.02,'#564c43');eyes(body,.12,.66,-.11,{size:.026});tail(body,[{x:0,y:.15,z:.03},{x:0,y:.03,z:.15}],[.04,.015],'#8b7865');
 }else if(['ant','beetle','butterfly'].includes(p.kind)){
  const ant=p.kind==='ant',butterfly=p.kind==='butterfly',dark=ant?'#303936':butterfly?p.body:p.head||p.body;
  ellipsoid(body,0,.25,-.47,ant?.19:.18,.16,ant?.22:.16,.065,[dark]); // head
  ellipsoid(body,0,.23,-.17,ant?.13:.23,.14,.22,.065,[dark]); // thorax
  if(ant){block(body,0,.22,.10,.10,.11,.18,'#3d4540');ellipsoid(body,0,.27,.38,.25,.21,.32,.075,['#303936','#3b4340']);}
  else if(!butterfly){ellipsoid(body,0,.28,.25,p.wide?.36:p.slender?.22:.28,p.dung?.27:.20,p.slender?.46:.38,.08,[p.body,p.body,p.body]);block(body,0,.46,.23,.016,.025,.54,'#2d3631');}
  else ellipsoid(body,0,.23,.18,.075,.07,.39,.045,[dark]);
  // Exactly three bilateral leg pairs, all attached to the thorax, never to the abdomen.
  for(const s of [-1,1])for(let k=0;k<3;k++){
   const origin={x:s*.10,y:.22,z:-.30+k*.12},knee={x:s*(butterfly&&k===0?.22:.36),y:.13,z:origin.z+(k-1)*.18},foot={x:s*(butterfly&&k===0?.27:.50),y:.025,z:origin.z+(k-1)*.26};chain(body,[origin,knee,foot],[.032,.029,.019],dark,'leg-'+s+'-'+k);counts.legs++;
  }
  for(const s of [-1,1]){
   const long=p.longhorn,points=[{x:s*.10,y:.33,z:-.50},{x:s*.26,y:.41,z:long?-.85:-.67},{x:s*(long?.51:.34),y:long?.28:.43,z:long?-1.12:-.84}];chain(body,points,[.025,.023,.015],dark,'antenna-'+s);counts.antennae++;
   if(!ant&&!butterfly&&!p.chafer&&!p.dung&&!p.longhorn){const length=p.mandibles;chain(body,[{x:s*.12,y:.28,z:-.53},{x:s*.22,y:.29,z:-.60-length*.55},{x:s*.13,y:.29,z:-.60-length}],[.06,.045,.025],dark,'mandible-'+s);for(let k=0;k<3;k++)block(body,s*.14,.29,-.63-k*length*.22,.09,.055,.045,dark);counts.mandibles++;}
  }
  eyes(body,.16,.29,-.51,{size:.04});
  if(p.grooves||p.stripes)for(const s of [-1,1])for(let k=0;k<(p.stripes?2:4);k++)block(body,s*(.06+k*.055),.44,.24,.025,.04,.51,p.stripes?'#c8b995':'#77725b');
  if(p.hairy)for(let k=0;k<22;k++)block(body,Math.sin(k*2.4)*.22,.43+Math.cos(k)*.025,-.02+(k%5)*.11,.025,.07,.025,'#b19771');
  if(p.longhorn){for(const s of [-1,1])for(let k=0;k<3;k++)block(body,s*.13,.47,-.01+k*.20,.11,.035,.10,'#303939');}
  if(p.dung){block(body,0,.45,-.43,.24,.10,.23,'#46534c');for(const s of [-1,1])block(body,s*.13,.41,-.54,.055,.11,.12,'#38413b');}
  if(butterfly){batch(body);for(const s of [-1,1])for(const front of [true,false]){
    const wing=new THREE.Group();wing.name=(front?'fore':'hind')+'-wing-'+s;wing.position.set(s*.045,.28,front?-.12:.19);group.add(wing);const wb=[];
    const width=front?.68:.52,depth=front?.65:.47;
    for(let ix=0;ix<6;ix++)for(let iz=0;iz<6;iz++){const x=(ix+.5)/6,z=(iz+.5)/6;if((x-.28)**2/.7+(z-.5)**2/.3>1)continue;block(wb,s*x*width,0,(z-.5)*depth,.125,.045,.12,p.wing);if(ix>0&&ix<5&&iz>0&&iz<5&&(!p.swallowtail||(ix+iz)%2===0))block(wb,s*x*width,.029,(z-.5)*depth,p.swallowtail?.075:.105,.02,p.swallowtail?.075:.105,p.marks);}
    if(p.swallowtail&&!front)block(wb,s*.34,0,.34,.07,.05,.27,p.wing);
    batch(wb,wing);animations.push({node:wing,axis:'z',amplitude:s*.22,speed:p.swallowtail?1.8:1.2,base:s*.25});counts.wings++;
   }}
 }
 if(!meshes.some(m=>m.parent===group))batch(body);
 // Geometry sits on y=0. Parent placement can rotate the whole animal onto bark or into water.
 group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group),offset=-box.min.y;
 for(const child of group.children)child.position.y+=offset;
 for(const b of parts.values()){b.min.y+=offset;b.max.y+=offset;}
 for(const path of paths)for(const v of path.points)v.y+=offset;
 group.updateMatrixWorld(true);for(const child of group.children)if(child.isGroup&&child.name)parts.set(child.name,new THREE.Box3().setFromObject(child));const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
 return {id,kind:p.kind,group,counts,height:size.y,bounds,parts,paths,meshes,
  update(time){for(const a of animations)a.node.rotation[a.axis]=(a.base||0)+Math.sin(time*a.speed)*a.amplitude;},
  dispose(){for(const m of meshes)m.dispose();geometry.dispose();material.dispose();group.clear();}
 };
}
