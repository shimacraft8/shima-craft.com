import {pageIndex,swipePage,slideIndex,nearestSlide,slideOffset,bookProgress,chapterFromTarget,chapterUrl} from './model.js';
import {resolveLegacyTarget} from '../museum/model.js';
const story=document.querySelector('[data-storybook]');if(story)start();
function start(){
 const $=id=>document.getElementById(id),book=$('nature-book'),tabs=[...book.querySelectorAll('[role="tab"]')],panels=[...book.querySelectorAll('[role="tabpanel"]')],reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const stage=story.querySelector('.book-stage'),track=$('stage-track'),slots=[...track.querySelectorAll('.stage-slot')],chapters=slots.map(el=>el.dataset.chapter),links=[...story.querySelectorAll('[data-chapter-link]')],prev=$('stage-prev'),next=$('stage-next'),counter=$('stage-count');
 let data=null,current=null,page=0,opener=null,entryInHistory=false,fromHistory=false;
 let raf=0,settle=0,index=0,pending=null,width=0,lefts=[],pan=null,panEnd=0,urlChapter=chapters[0];
 const text=(id,value)=>$(id).textContent=value??'';
 // One motion switch for the whole page: #motion-toggle in app.js, plus the OS setting.
 const still=()=>reduce.matches||document.body.classList.contains('motion-paused');
 function measure(){
  const header=document.querySelector('.site-header');
  if(header){const h=Math.ceil(header.getBoundingClientRect().height)+'px';if(document.documentElement.style.getPropertyValue('--story-header')!==h)document.documentElement.style.setProperty('--story-header',h);}
  width=track.clientWidth;lefts=slots.map(el=>el.offsetLeft);
  if(width&&lefts[index]!==undefined&&Math.abs(track.scrollLeft-lefts[index])>2)track.scrollTo({left:lefts[index],behavior:'auto'});
  schedule();
 }
 function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(paint);}
 // Every page position comes from the real scroll offset, so a turn can be interrupted at any frame.
 function paint(){
  raf=0;if(!width)return;if(track.scrollTop)track.scrollTop=0;
  const left=track.scrollLeft,offsets=[];let near=0,best=Infinity;
  for(let i=0;i<slots.length;i++){const p=slideOffset(lefts[i],left,width);offsets.push(p);if(Math.abs(p)<best){best=Math.abs(p);near=i;}}
  for(let i=0;i<slots.length;i++){const slot=slots[i],p=offsets[i];
   slot.style.setProperty('--p',p.toFixed(4));slot.style.setProperty('--a',Math.min(Math.abs(p),1).toFixed(4));
   slot.classList.toggle('is-near',Math.abs(p)<1.02);slot.classList.toggle('is-current',i===near);
   slot.classList.toggle('is-after',p>.001);slot.classList.toggle('is-before',p<-.001);if(i!==near&&slot.contains(document.activeElement))track.focus({preventScroll:true});slot.inert=i!==near;}
  if(pending!==null){if(Math.abs(offsets[pending])<.02)pending=null;}
  else if(near!==index)markIndex(near);
 }
 function markIndex(i){
  index=i;const id=chapters[i];
  counter.textContent=slots[i].dataset.count||'';
  for(const link of links){if(link.dataset.chapterLink===id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
  stage.style.setProperty('--book-progress',bookProgress(i,slots.length).toFixed(4));
  edge(prev,i<=0,'#'+slots[Math.max(0,i-1)].id);edge(next,i>=slots.length-1,'#'+slots[Math.min(slots.length-1,i+1)].id);
 }
 // A disabled endpoint control never keeps the focus ring on a dead link.
 function edge(el,off,href){
  el.setAttribute('href',href);const was=el.getAttribute('aria-disabled')==='true';el.setAttribute('aria-disabled',String(off));
  if(off&&!was&&document.activeElement===el)track.focus({preventScroll:true});
 }
 function syncChapter(id,push){
  if(id===urlChapter)return;const url=chapterUrl(location.href,id,chapters[0]);
  if(push)history.pushState({amamiChapter:id},'',url);else history.replaceState(history.state,'',url);
  urlChapter=id;
 }
 function goTo(target,{push=false,instant=false,reveal=false}={}){
  if(!width)return;const i=slideIndex(target,slots.length),jump=instant||still();
  track.classList.toggle('is-jumping',Math.abs(lefts[i]-track.scrollLeft)>width*1.05);markIndex(i);pending=i;
  if(width)track.scrollTo({left:lefts[i],behavior:jump?'auto':'smooth'});
  if(reveal)revealStage(jump);
  syncChapter(chapters[i],push);schedule();
  clearTimeout(settle);settle=setTimeout(onSettle,jump?60:640);
 }
 function onSettle(){
  pending=null;track.classList.remove('is-jumping');if(!width)return;
  const i=nearestSlide(track.scrollLeft,width,slots.length);
  if(i!==index)markIndex(i);
  syncChapter(chapters[i],true);
 }
 function revealStage(instant){
  const rect=stage.getBoundingClientRect(),offset=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--story-header'),10)||88;
  if(rect.top<offset-4||rect.top>innerHeight*.5)scrollTo({top:Math.max(0,scrollY+rect.top-offset-8),behavior:instant?'auto':'smooth'});
 }
 track.addEventListener('scroll',()=>{schedule();clearTimeout(settle);settle=setTimeout(onSettle,160);},{passive:true});
 track.addEventListener('keydown',e=>{
  if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||(e.target instanceof HTMLElement&&e.target.matches('input,select,textarea')))return;
  let target;
  if(e.key==='ArrowRight')target=index+1;else if(e.key==='ArrowLeft')target=index-1;else if(e.key==='Home')target=0;else if(e.key==='End')target=slots.length-1;else return;
  e.preventDefault();goTo(target,{push:true});
 });
 // Mouse drag scrolls the track; touch keeps the browser's own pan so vertical scrolling is never blocked.
 track.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0||pan)return;
  if(e.target instanceof Element&&e.target.closest('a,button,summary,input,select,textarea'))return;
  pan={id:e.pointerId,x:e.clientX,y:e.clientY,left:track.scrollLeft,from:index,moved:false};
 });
 track.addEventListener('pointermove',e=>{
  if(pan?.id!==e.pointerId)return;const dx=e.clientX-pan.x;
  if(!pan.moved){if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(e.clientY-pan.y))return;pan.moved=true;pending=null;track.classList.add('is-dragging');try{track.setPointerCapture(e.pointerId)}catch{}}
  track.scrollLeft=pan.left-dx;
 });
 const endPan=e=>{
  if(pan?.id!==e.pointerId)return;const held=pan;pan=null;track.classList.remove('is-dragging');
  if(!held.moved)return;
  panEnd=performance.now();
  goTo(held.from+(e.type==='pointerup'?swipePage(e.clientX-held.x,e.clientY-held.y):0),{push:true});
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])track.addEventListener(event,endPan);
 track.addEventListener('click',e=>{if(performance.now()-panEnd<180){e.preventDefault();e.stopPropagation();}},true);
 // Page links keep real hrefs: without JavaScript the anchors still scroll the track to the right page.
 story.addEventListener('click',e=>{
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const a=e.target.closest?.('a[href]');if(!a)return;
  if(a.getAttribute('aria-disabled')==='true'){e.preventDefault();return;}
  if(a.dataset.bookOpen)return;
  const href=a.getAttribute('href')||'';if(href[0]!=='#')return;
  const i=slots.findIndex(el=>el.id===href.slice(1));if(i<0)return;
  e.preventDefault();goTo(i,{push:true,reveal:true});
  if(a.closest('.stage-slot'))track.focus({preventScroll:true});
 });
 addEventListener('hashchange',()=>{const id=chapterFromTarget('',location.hash,chapters);if(!id)return;const i=chapters.indexOf(id);if(i>=0&&i!==index){urlChapter=id;goTo(i,{});}});
 // Pointer-driven depth settles to rest; no idle frame loop and no cursor replacement.
 let lookRaf=0,lookX=0,lookY=0,aimX=0,aimY=0,lookRect=null;
 function paintLook(){lookRaf=0;lookX+=(aimX-lookX)*.14;lookY+=(aimY-lookY)*.14;const done=Math.abs(aimX-lookX)+Math.abs(aimY-lookY)<.05;if(done){lookX=aimX;lookY=aimY;}stage.style.setProperty('--look-x',lookX.toFixed(2)+'px');stage.style.setProperty('--look-y',lookY.toFixed(2)+'px');if(!done)lookRaf=requestAnimationFrame(paintLook);}
 function aimLook(x=0,y=0){aimX=x;aimY=y;if(!lookRaf&&!document.hidden)lookRaf=requestAnimationFrame(paintLook);}
 function resetLook(){cancelAnimationFrame(lookRaf);lookRaf=0;lookX=lookY=aimX=aimY=0;stage.style.setProperty('--look-x','0px');stage.style.setProperty('--look-y','0px');}
 track.addEventListener('pointerenter',()=>{lookRect=track.getBoundingClientRect();});
 track.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||pan||still()||book.open)return;if(!lookRect)lookRect=track.getBoundingClientRect();aimLook(((e.clientX-lookRect.left)/lookRect.width-.5)*12,((e.clientY-lookRect.top)/lookRect.height-.5)*8);},{passive:true});
 track.addEventListener('pointerleave',()=>aimLook());
 reduce.addEventListener('change',resetLook);
 new MutationObserver(()=>{if(still()||book.open)resetLook();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetLook();});
 const resize=new ResizeObserver(measure);resize.observe(document.querySelector('.site-header'));resize.observe(story.querySelector('.stage-viewport'));
 addEventListener('resize',measure,{passive:true});addEventListener('pageshow',measure);reduce.addEventListener('change',schedule);
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 new IntersectionObserver(entries=>{for(const entry of entries)stage.classList.toggle('is-onscreen',entry.intersectionRatio>=.15);},{threshold:.15}).observe(stage);
 document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('story-hidden',document.hidden);if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
 text('stage-hint','左右キー・ドラッグ・スワイプでめくる / 生き物をひらく');story.classList.add('story-ready');measure();
 const opening=chapterFromTarget(location.search,location.hash,chapters);
 if(opening){urlChapter=opening;const i=chapters.indexOf(opening);markIndex(i);if(i>0)goTo(i,{instant:true});}
 else markIndex(nearestSlide(track.scrollLeft,width,slots.length));
 function link(parent,label,url){if(!/^https:\/\//.test(url))return;const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}
 function urlForPage(){const u=new URL(location.href);u.searchParams.set('exhibit',current.id);page?u.searchParams.set('book',page===1?'photo':'facts'):u.searchParams.delete('book');return u;}
 function showPage(value,{focus=false,sync=true}={}){
  page=pageIndex(value);tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===page));tab.tabIndex=i===page?0:-1;panels[i].hidden=i!==page;});
  if((document.activeElement===$('book-prev')&&page===0)||(document.activeElement===$('book-next')&&page===2))tabs[page].focus({preventScroll:true});$('book-prev').disabled=page===0;$('book-next').disabled=page===2;text('book-page-status',`${page+1} / 3`);
  if(page===1&&current){const photo=data.photos[current.id],image=$('book-photo');if(photo&&image.dataset.id!==current.id){image.dataset.id=current.id;image.hidden=false;image.alt=current.name+'の参考写真';image.width=photo.width;image.height=photo.height;image.onerror=()=>{image.hidden=true;image.dataset.id='';text('book-photo-caption','写真を読み込めませんでした。写真の出典または詳細ページからご確認ください。');};image.src=photo.src;}}
  if(focus)tabs[page].focus();if(sync&&current)history.replaceState(history.state,'',urlForPage());
 }
 function openBook(id,trigger,{sync=true,initialPage=0}={}){
  const s=data?.species.find(s=>s.id===id);if(!s)return false;
  const wasOpen=book.open;current=s;opener=trigger||null;const index=data.species.indexOf(s)+1;
  text('book-title',s.name);text('book-group',s.group+' / '+s.habitat);text('book-latin',s.scientific);text('book-number','NO. '+String(index).padStart(3,'0'));text('book-lead',s.lead);text('book-fact',s.fact);
  const art=$('book-art');art.hidden=true;art.onload=()=>{art.hidden=false;};art.onerror=()=>{art.hidden=true;text('book-lead','イラストを読み込めませんでした');text('book-fact','実際の写真または詳細ページでご確認ください。');};art.src=`/wildlife/assets/animals/${s.asset}.webp`;art.alt=s.name+'のイラスト';art.draggable=false;
  const photo=data.photos[id],credit=$('book-photo-credit');credit.replaceChildren();text('book-photo-caption',photo?.caption||'参考写真は準備中です。');$('book-photo').hidden=!photo;$('book-photo').draggable=false;
  if(photo){credit.append(document.createTextNode(photo.author+' / '));link(credit,photo.license,photo.licenseUrl);credit.append(document.createTextNode(' · '));link(credit,'写真の出典 ↗',photo.sourcePage);}
  const facts=$('book-facts');facts.replaceChildren();for(const [name,value] of [['生息環境',s.habitat],['資料で確認した島',s.islands.join('・')],['季節・渡り',s.season],['特徴',s.features?.join('・')],['分類の注記',s.taxonomyNote]]){if(!value)continue;const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;row.append(dt,dd);facts.append(row);}
  const sources=$('book-sources');sources.replaceChildren();for(const key of s.sources){const source=data.sources[key];if(source){const li=document.createElement('li');link(li,source.title+' ↗',source.url);sources.append(li);}}
  $('book-detail').href='/wildlife/species/'+id+'/';$('book-source-detail').open=true;showPage(initialPage,{sync:false});
  if(sync){if(!wasOpen){history.pushState({amamiBook:true},'',urlForPage());entryInHistory=true;}else history.replaceState(history.state,'',urlForPage());}
  if(!sync)entryInHistory=Boolean(history.state?.amamiBook);if(!wasOpen)book.showModal();book.scrollTop=0;document.body.classList.add('book-is-open');$('book-close').focus({preventScroll:true});return true;
 }
 // Every illustration retains a real detail-page href as its no-JS/fetch-failure fallback.
 document.addEventListener('click',e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const a=e.target.closest('a[data-book-open]');if(!a||!data)return;if(openBook(a.dataset.bookOpen,a))e.preventDefault();});
 $('book-close').addEventListener('click',()=>book.close());
 book.addEventListener('close',()=>{document.body.classList.remove('book-is-open');const focus=opener?.isConnected?opener:document.querySelector('.site-header .brand');const goBack=entryInHistory&&!fromHistory;entryInHistory=false;fromHistory=false;current=null;
  if(goBack)history.back();else{const u=new URL(location.href);u.searchParams.delete('exhibit');u.searchParams.delete('book');u.searchParams.delete('room');u.searchParams.delete('shelf');history.replaceState(history.state,'',u);}focus?.focus({preventScroll:true});schedule();
 });
 book.addEventListener('click',e=>{if(e.target!==book)return;const r=book.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)book.close();});
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>showPage(i));tab.addEventListener('keydown',e=>{let index;if(e.key==='ArrowRight')index=(i+1)%3;else if(e.key==='ArrowLeft')index=(i+2)%3;else if(e.key==='Home')index=0;else if(e.key==='End')index=2;else return;e.preventDefault();showPage(index,{focus:true});});});
 $('book-prev').addEventListener('click',()=>showPage(page-1));$('book-next').addEventListener('click',()=>showPage(page+1));
 for(const plate of book.querySelectorAll('.book-plate,.book-real')){let drag=null;plate.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};plate.setPointerCapture(e.pointerId);});plate.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;const d=drag;drag=null;const step=swipePage(e.clientX-d.x,e.clientY-d.y);if(step)showPage(page+step);});for(const event of ['pointercancel','lostpointercapture'])plate.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});}
 addEventListener('popstate',()=>{
  const p=new URLSearchParams(location.search),chapter=chapterFromTarget(location.search,location.hash,chapters)||chapters[0],target=chapters.indexOf(chapter);
  if(target>=0&&target!==index){urlChapter=chapter;goTo(target,{});}else urlChapter=chapter;
  if(!data)return;const id=p.get('exhibit');
  if(id&&data.species.some(s=>s.id===id)){openBook(id,null,{sync:false,initialPage:p.get('book')==='photo'?1:p.get('book')==='facts'?2:0});}else if(book.open){fromHistory=true;book.close();}
 });
 (async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch('/wildlife/data/museum.json',{signal:controller.signal});if(!response.ok)throw Error('data');data=await response.json();const params=new URLSearchParams(location.search),legacy=resolveLegacyTarget(params,data.species);if(legacy?.species){openBook(legacy.species.id,null,{sync:false,initialPage:params.get('book')==='photo'||params.get('view')==='photo'?1:params.get('book')==='facts'?2:0});}story.dataset.ready='true';}catch{story.dataset.ready='fallback';}finally{clearTimeout(timer);}})();
}
