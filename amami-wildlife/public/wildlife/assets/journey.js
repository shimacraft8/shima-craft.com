/* Native document scroll drives the desktop exhibition; no wheel interception. */
(()=>{
 'use strict';
 const section=document.querySelector('.habitat-journey');if(!section)return;
 const track=section.querySelector('.journey-track');
 const panels=[...section.querySelectorAll('.journey-chapter')];
 const buttons=[...section.querySelectorAll('[data-chapter]')];
 const prev=section.querySelector('[data-journey-prev]'),next=section.querySelector('[data-journey-next]');
 const status=section.querySelector('.journey-status');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const desktop=matchMedia('(min-width:1050px) and (min-height:650px)');
 let enhanced=false,current=-1,frame=0,measureFrame=0,top=0,span=1,width=0;
 const finePointer=matchMedia('(hover:hover) and (pointer:fine)');
 let pointerFrame=0,pointerX=0,pointerY=0;
 const clamp=n=>Math.max(0,Math.min(1,n));
 function select(index){
  if(index===current)return;current=index;
  panels.forEach((panel,i)=>{panel.classList.toggle('is-current',i===index);panel.inert=enhanced&&i!==index;if(enhanced&&i!==index)panel.setAttribute('aria-hidden','true');else panel.removeAttribute('aria-hidden');});
  buttons.forEach((button,i)=>{i===index?button.setAttribute('aria-current','step'):button.removeAttribute('aria-current');});
  prev.disabled=index===0;next.disabled=index===panels.length-1;
 }
 function render(){
  frame=0;if(!enhanced)return;
  const progress=clamp((window.scrollY-top)/span);
  track.style.setProperty('--journey-x',`${-progress*width*(panels.length-1)}px`);
  const stopped=document.body.classList.contains('motion-paused');
  panels.forEach((panel,i)=>{const distance=Math.max(-1,Math.min(1,progress*(panels.length-1)-i));panel.style.setProperty('--chapter-offset',String(stopped?0:distance));});
  section.style.setProperty('--journey-progress',String((1+progress*(panels.length-1))/panels.length));
  select(Math.round(progress*(panels.length-1)));
 }
 function schedule(){if(!frame&&enhanced)frame=requestAnimationFrame(render);}
 function measure(){
  measureFrame=0;top=section.getBoundingClientRect().top+window.scrollY;span=Math.max(1,section.offsetHeight-window.innerHeight);width=section.querySelector('.journey-window').clientWidth;render();
 }
 function configure(){
  enhanced=desktop.matches&&!reduce.matches;section.classList.toggle('journey-ready',enhanced);
  current=-1;select(0);
  if(!enhanced){track.style.removeProperty('--journey-x');panels.forEach(p=>{p.inert=false;p.removeAttribute('aria-hidden');});}
  if(measureFrame)cancelAnimationFrame(measureFrame);measureFrame=requestAnimationFrame(measure);
 }
 function go(index,smooth=true,sync=true){
  index=Math.max(0,Math.min(panels.length-1,index));
  const behavior=smooth&&!reduce.matches&&!document.body.classList.contains('motion-paused')?'smooth':'instant';
  if(enhanced)window.scrollTo({top:top+span*index/(panels.length-1),behavior});
  else panels[index].scrollIntoView({behavior,block:'start'});
  if(sync){const url=new URL(location.href);url.searchParams.set('chapter',panels[index].id.replace('habitat-',''));url.hash='explore';history.replaceState(null,'',url);}
  status.textContent=`${panels[index].querySelector('h2').textContent}生き物`;
  if(!enhanced)select(index);
 }
 buttons.forEach((button,i)=>{button.addEventListener('click',()=>go(i));button.addEventListener('keydown',event=>{let index;if(event.key==='ArrowRight')index=Math.min(i+1,panels.length-1);else if(event.key==='ArrowLeft')index=Math.max(0,i-1);else if(event.key==='Home')index=0;else if(event.key==='End')index=panels.length-1;else return;event.preventDefault();buttons[index].focus();go(index);});});
 prev.addEventListener('click',()=>go(current-1));next.addEventListener('click',()=>go(current+1));
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',()=>{if(!measureFrame)measureFrame=requestAnimationFrame(measure);},{passive:true});
 desktop.addEventListener('change',configure);reduce.addEventListener('change',configure);
 function paintPointer(){pointerFrame=0;if(reduce.matches||document.body.classList.contains('motion-paused')){pointerX=0;pointerY=0;}section.style.setProperty('--pointer-x',String(pointerX));section.style.setProperty('--pointer-y',String(pointerY));}
 section.addEventListener('pointermove',event=>{if(!enhanced||!finePointer.matches||reduce.matches)return;pointerX=(event.clientX/window.innerWidth-.5)*2;pointerY=(event.clientY/window.innerHeight-.5)*2;if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);},{passive:true});
 section.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);});
 document.querySelector('#motion-toggle')?.addEventListener('click',()=>{paintPointer();schedule();});
 const viewportObserver=new IntersectionObserver(entries=>{section.classList.toggle('journey-out',!entries[0].isIntersecting);});viewportObserver.observe(section.querySelector('.journey-sticky'));
 const chapterObserver=new IntersectionObserver(entries=>{if(enhanced)return;for(const entry of entries)entry.target.classList.toggle('is-current',entry.isIntersecting);},{threshold:.25});panels.forEach(p=>chapterObserver.observe(p));
 configure();
 const requested=new URLSearchParams(location.search).get('chapter');const index=panels.findIndex(p=>p.id==='habitat-'+requested);
 if(index>=0&&(!location.hash||location.hash==='#explore'))requestAnimationFrame(()=>go(index,false,false));
 // Apply an explicit catalog anchor after the exhibition changes document height.
 const anchor=location.hash.slice(1);
 if(anchor==='catalog'||anchor.startsWith('group-'))requestAnimationFrame(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'instant',block:'start'}));
})();
