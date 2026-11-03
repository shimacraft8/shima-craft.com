import {VIEWPOINTS,resolveLegacyTarget} from './model.js';
const section=document.querySelector('.museum');
if(section)initialize();
async function initialize(){
 const $=id=>document.getElementById(id),host=$('museum-canvas'),dialog=$('museum-dialog'),labels=$('museum-labels');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'),pool=new Map(),found=new Set();
 let data,renderer=null,mode2d=true,selected=null,opener=null,loadPromise=null,spot='hego';
 const text=(el,value)=>{if(el)el.textContent=value??'';};
 const usable=node=>Boolean(node?.isConnected&&!node.disabled&&node.getClientRects().length);
 const paused=()=>document.body.classList.contains('motion-paused')||reduce.matches;
 function syncUrl(){const u=new URL(location.href);mode2d?u.searchParams.set('mode','2d'):u.searchParams.delete('mode');
  for(const k of ['room','shelf','zone'])u.searchParams.delete(k);
  if(!mode2d){u.searchParams.set('spot',spot);if(u.hash==='#catalog'||u.hash.startsWith('#group-'))u.hash='';}else u.searchParams.delete('spot');
  selected?u.searchParams.set('exhibit',selected):u.searchParams.delete('exhibit');history.replaceState(null,'',u);
 }
 function drawLabels(points){
  const active=new Set(points.map(p=>p.id));for(const [id,button] of pool)if(!active.has(id))button.hidden=true;
  for(const point of points){let button=pool.get(point.id);
   if(!button){button=document.createElement('button');button.type='button';button.className='museum-mark';button.textContent=point.name;if(point.range){const note=document.createElement('small');note.className='museum-range-note';note.textContent=point.range;button.append(note);}button.dataset.id=point.id;button.setAttribute('aria-label',point.name+'の解説をひらく');button.addEventListener('click',()=>openExhibit(point.id,button));pool.set(point.id,button);labels.append(button);}
   button.hidden=false;button.classList.toggle('is-selected',Boolean(point.selected));button.style.transform=`translate(${Math.round(point.x)}px,${Math.round(point.y)}px) translate(-50%,-100%)`;
  }
 }
 /* ---------- exhibit dialog ---------- */
 function addLink(parent,label,url){
  const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
 }
 function openExhibit(id,trigger){
  const entry=data?.species.find(s=>s.id===id),photo=data?.photos[id];
  if(!entry)return;
  opener=usable(trigger)?trigger:null;selected=id;renderer?.setSelected(id);renderer?.setDialog(true);
  text($('exhibit-title'),entry.name);text($('exhibit-group'),`${entry.group} / ${entry.habitat}`);
  text($('exhibit-scientific'),entry.scientific);text($('exhibit-lead'),entry.lead);text($('exhibit-fact'),entry.fact);
  const image=$('exhibit-photo'),caption=$('exhibit-caption'),credit=$('exhibit-credit');
  if(photo){
   image.src=photo.src;image.alt=`${entry.name}の参考写真`;image.width=photo.width;image.height=photo.height;image.hidden=false;
   image.onerror=()=>{image.hidden=true;text(caption,'写真を読み込めませんでした。詳細ページで出典ごとご確認ください。');};
   text(caption,photo.caption);
   credit.replaceChildren(document.createTextNode(`${photo.author} / `));
   addLink(credit,photo.license,photo.licenseUrl);
   credit.append(document.createTextNode(' · '));
   addLink(credit,'写真の出典 ↗',photo.sourcePage);
  }else{
   image.hidden=true;text(caption,'この項目の参考写真は準備中です。');credit.replaceChildren();
  }
  const facts=$('exhibit-facts');facts.replaceChildren();
  for(const [name,value] of [['生息環境',entry.habitat],['分布の確認範囲',entry.islands.join('・')],['季節',entry.season],
   ['分類の注記',entry.taxonomyNote],['特徴',entry.features?.join('・')]]){
   if(!value)continue;
   const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
   dt.textContent=name;dd.textContent=value;row.append(dt,dd);facts.append(row);
  }
  const sources=$('exhibit-sources');sources.replaceChildren();
  for(const key of entry.sources){
   const source=data.sources[key];if(!source)continue;
   const li=document.createElement('li');addLink(li,source.title+' ↗',source.url);sources.append(li);
  }
  $('exhibit-detail').href=`/wildlife/species/${entry.id}/?view=photo`;
  dialog.querySelector('details').open=false;
  found.add(id);text($('forest-found'),`見つけた ${found.size} / ${data.species.length}`);
  if(!dialog.open)dialog.showModal();
  $('exhibit-close').focus();syncUrl();
 }
 dialog.addEventListener('close',()=>{
  const last=selected;
  selected=null;renderer?.setDialog(false);renderer?.setSelected(null);syncUrl();
  // Deep links and markers that scrolled out of view must never lose the focus ring.
  const target=[opener,pool.get(last),$('museum-species'),$('forest-enter'),$('museum-mode')].find(usable);
  target?.focus({preventScroll:true});opener=null;
 });
 $('exhibit-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const focusable=[...dialog.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 });
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });


 function setMode(two){mode2d=two;section.classList.toggle('is-2d',two);document.body.classList.toggle('forest-active',!two);section.classList.toggle('is-live',!two);}
 function exitForest(sync=true){renderer?.dispose();renderer=null;labels.replaceChildren();pool.clear();setMode(true);$('museum-loading').hidden=true;
  if(sync){const u=new URL(location.href);u.hash='catalog';history.replaceState(null,'',u);syncUrl();const c=$('catalog');c.setAttribute('tabindex','-1');c.scrollIntoView({block:'start',behavior:'instant'});c.focus({preventScroll:true});}
 }
 function failure(message){exitForest(false);$('museum-failure').hidden=false;text($('museum-failure'),message);syncUrl();}
 async function load3d(){if(renderer)return;if(loadPromise){setMode(false);return loadPromise;}
  setMode(false);$('museum-failure').hidden=true;$('museum-loading').hidden=false;
  loadPromise=(async()=>{let timer;
   try{
    const {MuseumRenderer}=await Promise.race([import('./renderer.js'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),20000);})]);
    if(mode2d)return;
    const requestedSpot=spot;renderer=new MuseumRenderer(host,{species:data.species,paused:paused(),onSelect:id=>openExhibit(id,pool.get(id)),onLabels:drawLabels,
     onReady:()=>{$('museum-loading').hidden=true;},onZoom:level=>{$('forest-zoom-in').disabled=level===2;$('forest-zoom-out').disabled=level===0;},onStatus:message=>{text($('museum-status'),message);},onFailure:failure,
     onPlace:p=>{spot=p.id;text($('forest-place-name'),p.name);text($('museum-status'),'現在地 '+p.name);$('forest-place').value=p.id;syncUrl();}});
    renderer.goToSpot(requestedSpot);
   }catch{renderer?.dispose();renderer=null;host.replaceChildren();failure('3Dを表示できませんでした。下の図鑑からすべての項目を開けます。');}
   finally{clearTimeout(timer);}
  })().finally(()=>loadPromise=null);return loadPromise;
 }
 $('museum-mode').addEventListener('click',()=>exitForest());
 $('forest-enter').addEventListener('click',async()=>{await load3d();syncUrl();host.querySelector('canvas')?.focus({preventScroll:true});});
 $('forest-place').addEventListener('change',e=>renderer?.goToSpot(e.target.value));
 for(const button of section.querySelectorAll('[data-turn]')){
  let pointer=null;
  const end=e=>{if(e?.pointerId!==undefined&&pointer!==e.pointerId)return;if(pointer!==null)renderer?.setTurning(button.dataset.turn,false);pointer=null;button.classList.remove('is-held');};
  button.addEventListener('pointerdown',e=>{if(e.button!==0||pointer!==null)return;e.preventDefault();host.querySelector('canvas')?.focus({preventScroll:true});pointer=e.pointerId;button.setPointerCapture(e.pointerId);button.classList.add('is-held');renderer?.setTurning(button.dataset.turn,true);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);
  button.addEventListener('click',e=>{if(e.detail!==0)return;const directions={left:[-Math.PI/6,0],right:[Math.PI/6,0],up:[0,.2],down:[0,-.2]};renderer?.turn(...directions[button.dataset.turn]);});
  addEventListener('blur',end);document.addEventListener('visibilitychange',end);
 }
 // Hold to walk. A keyboard/assistive click takes one step; pointer capture supports two-thumb play.
 for(const button of section.querySelectorAll('[data-walk]')){
  let pointer=null;
  const end=e=>{if(e?.pointerId!==undefined&&pointer!==e.pointerId)return;if(pointer!==null)renderer?.setMovement(button.dataset.walk,false);pointer=null;button.classList.remove('is-held');};
  button.addEventListener('pointerdown',e=>{if(e.button!==0||pointer!==null)return;e.preventDefault();host.querySelector('canvas')?.focus({preventScroll:true});pointer=e.pointerId;button.setPointerCapture(e.pointerId);button.classList.add('is-held');renderer?.setMovement(button.dataset.walk,true);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);
  button.addEventListener('click',e=>{if(e.detail!==0)return;renderer?.stepMovement(button.dataset.walk);});
  addEventListener('blur',end);dialog.addEventListener('close',end);document.addEventListener('visibilitychange',end);
 }
 $('forest-zoom-in').addEventListener('click',()=>renderer?.zoom(1));
 $('forest-zoom-out').addEventListener('click',()=>renderer?.zoom(-1));
 $('forest-reset').addEventListener('click',()=>{renderer?.goToSpot('hego');host.querySelector('canvas')?.focus({preventScroll:true});});
 $('museum-species').addEventListener('change',e=>{renderer?.focusSpecies(e.target.value);});
 $('museum-find').addEventListener('click',()=>{renderer?.focusSpecies($('museum-species').value);$('forest-search').open=false;});
 $('museum-open').addEventListener('click',e=>openExhibit($('museum-species').value,e.currentTarget));
 const motion=new MutationObserver(()=>renderer?.setPaused(paused()));motion.observe(document.body,{attributes:true,attributeFilter:['class']});
 reduce.addEventListener('change',()=>renderer?.setPaused(paused()));
 document.addEventListener('keydown',e=>{if(e.key!=='Escape'||dialog.open||mode2d||e.defaultPrevented)return;if(e.target.tagName==='SELECT')return;const open=section.querySelector('details[open]');if(open){open.open=false;open.querySelector('summary')?.focus();e.preventDefault();return;}exitForest();});
 for(const a of document.querySelectorAll('a[href$="#catalog"],a[href="#main"],a[href$="#explore"]'))a.addEventListener('click',e=>{
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
  const target=a.getAttribute('href');
  if(target.endsWith('#explore')){if(data){e.preventDefault();load3d();}return;}
  if(!mode2d){e.preventDefault();exitForest();}
 });
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);let response;
  try{response=await fetch('/wildlife/data/museum.json',{signal:controller.signal});}finally{clearTimeout(timeout);}
  if(!response.ok)throw Error('data');data=await response.json();
  $('forest-enter').disabled=false;$('museum-open').disabled=false;$('museum-find').disabled=false;
  const params=new URLSearchParams(location.search),legacy=resolveLegacyTarget(params,data.species);
  const requested=params.get('spot');if(VIEWPOINTS.some(p=>p.id===requested))spot=requested;
  const catalogHash=location.hash==='#catalog'||location.hash.startsWith('#group-');
  if(params.get('mode')==='2d'||catalogHash||reduce.matches||navigator.connection?.saveData)exitForest(false);else await load3d();
  if(legacy){$('museum-species').value=legacy.species.id;renderer?.focusSpecies(legacy.species.id);if(legacy.open||mode2d)openExhibit(legacy.species.id,null);}
  if(catalogHash){const target=$(location.hash.slice(1));requestAnimationFrame(()=>target?.scrollIntoView({block:'start',behavior:'instant'}));}
 }catch{failure('森のデータを読み込めませんでした。下の図鑑から各ページを開けます。');}
 addEventListener('pagehide',()=>{renderer?.dispose();renderer=null;});
 addEventListener('pageshow',e=>{if(e.persisted&&!mode2d)load3d();});
}
