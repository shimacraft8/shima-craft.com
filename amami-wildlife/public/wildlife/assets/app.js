/* No analytics, forms, credentials or third-party runtime dependencies. */
(()=>{
 'use strict';
 const base='/wildlife/';
 const $=s=>document.querySelector(s);
 const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
 const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const motion=$('#motion-toggle');
 let paused=storage.get('amami-wildlife-motion')==='paused'||reduce.matches;
 function updateMotion(){document.body.classList.toggle('motion-paused',paused);document.documentElement.classList.toggle('motion-paused',paused);if(motion){motion.textContent=paused?'動きを再開する':'動きを止める';motion.setAttribute('aria-pressed',String(paused));}}
 updateMotion();
 motion?.addEventListener('click',()=>{paused=!paused;storage.set('amami-wildlife-motion',paused?'paused':'playing');updateMotion()});
 reduce.addEventListener('change',e=>{if(e.matches){paused=true;updateMotion()}});
 const day=$('#day-toggle');
 day?.addEventListener('click',()=>{const night=document.body.classList.toggle('night');day.textContent=night?'昼の色にする':'夜の色にする';day.setAttribute('aria-pressed',String(night));});
 const gallery=$('.media-gallery');
 if(gallery){
  const tabs=[...gallery.querySelectorAll('[role="tab"]')];
  function selectMedia(index,sync=true){for(const [i,tab] of tabs.entries()){const active=i===index;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;}if(sync){const u=new URL(location.href);index?u.searchParams.set('view','photo'):u.searchParams.delete('view');history.replaceState(null,'',u);}}
  selectMedia(new URLSearchParams(location.search).get('view')==='photo'?1:0,false);
  tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectMedia(i));tab.addEventListener('keydown',e=>{let index;if(e.key==='ArrowRight'||e.key==='ArrowLeft')index=1-i;else if(e.key==='Home')index=0;else if(e.key==='End')index=1;else return;e.preventDefault();selectMedia(index);tabs[index].focus();});});
 }
 const filters=$('#filters');
 if(filters){
  const cards=[...document.querySelectorAll('#species-grid .species-card')];const keys=['q','group','island','habitat','season'];let data;let shown=6;let debounce;
  const more=$('#show-more');
  function state(){return Object.fromEntries(keys.map(k=>[k,filters.elements.namedItem(k).value]));}
  function restore(){const params=new URLSearchParams(location.search);for(const k of keys){const input=filters.elements.namedItem(k);input.value=params.get(k)||'';}shown=params.get('all')==='1'?Number.MAX_SAFE_INTEGER:6;}
  function apply(sync=true){
   if(!data)return;const v=state(),query=normalize(v.q.trim());
   const matching=data.filter(s=>(!query||normalize([s.name,s.scientific,s.lead].join(' ')).includes(query))&&(!v.group||s.group===v.group)&&(!v.island||s.islands.includes(v.island))&&(!v.habitat||s.habitat===v.habitat)&&(!v.season||s.season.includes(v.season)));
   const matchingIds=new Set(matching.map(s=>s.id));let visible=0,hasMore=false;
   for(const section of document.querySelectorAll('.taxon-section')){
    const sectionCards=[...section.querySelectorAll('.species-card')];let count=0,total=0;
    for(const c of sectionCards){const matches=matchingIds.has(c.dataset.id);if(matches)total++;c.hidden=!(matches&&count<shown);if(!c.hidden){count++;visible++;}}
    section.hidden=total===0;section.querySelector('.group-count').textContent=total>count?`${count} / ${total}項目`:`${total}項目`;
    if(total>count)hasMore=true;
    const jump=[...document.querySelectorAll('[data-group-jump]')].find(a=>a.dataset.groupJump===section.dataset.group);
    if(jump){jump.hidden=total===0;jump.querySelector('span').textContent=String(total);}
   }
   $('#result-count').textContent=`${matching.length.toLocaleString('ja-JP')}項目${matching.length>visible?` / ${visible}項目を表示`:''}`;
   $('#empty').hidden=matching.length>0;$('#island-note').hidden=!v.island;$('#reset-filters').hidden=!keys.some(k=>v[k]);more.hidden=!hasMore;
   if(sync){const u=new URL(location.href);for(const k of keys){v[k]?u.searchParams.set(k,v[k]):u.searchParams.delete(k);}shown>6?u.searchParams.set('all','1'):u.searchParams.delete('all');history.replaceState(null,'',u);}
  }
  restore();
  fetch(base+'data/species.json').then(r=>{if(!r.ok)throw Error('data');return r.json()}).then(d=>{data=d;apply(false)}).catch(()=>{
   const p=document.createElement('p');p.className='notice';p.setAttribute('role','alert');p.textContent='絞り込みデータを読み込めませんでした。通信を確認して再読み込みしてください。一覧から各ページは開けます。';filters.after(p);for(const el of filters.elements)el.disabled=true;
  });
  filters.addEventListener('submit',e=>{e.preventDefault();clearTimeout(debounce);shown=6;apply()});
  filters.addEventListener('input',e=>{clearTimeout(debounce);debounce=setTimeout(()=>{shown=6;apply()},e.target.type==='search'?160:0)});
  $('#reset-filters').addEventListener('click',()=>{clearTimeout(debounce);filters.reset();shown=6;apply();$('#q').focus()});
  more.addEventListener('click',()=>{clearTimeout(debounce);const hidden=cards.filter(c=>c.hidden);shown=Number.MAX_SAFE_INTEGER;apply();const next=hidden.find(c=>!c.hidden);next?.querySelector('a').focus();});
  window.addEventListener('popstate',()=>{restore();apply(false)});
 }
 const recordForm=$('#record-filter');
 if(recordForm){
  const recordParams=new URLSearchParams(location.search);$('#record-q').value=recordParams.get('record-q')||'';
  let records,sources,limit=50;const load=$('#load-records');const more=$('#more-records');
  async function show(reset=true){
   if(reset)limit=50;load.disabled=true;load.textContent='読み込み中…';
   try{
    if(!records){const responses=await Promise.all([fetch(base+'data/checklist-records.json'),fetch(base+'data/sources.json')]);if(responses.some(r=>!r.ok))throw Error('records');[records,sources]=await Promise.all(responses.map(r=>r.json()));}
    const query=$('#record-q').value.trim();const u=new URL(location.href);query?u.searchParams.set('record-q',query):u.searchParams.delete('record-q');history.replaceState(null,'',u);
    const q=normalize(query);const rows=records.filter(r=>normalize([r.name||'',r.scientificAsPrinted||'',r.japaneseRomanizedAsPrinted||'',r.island||''].join(' ')).includes(q));
    const tbody=$('#record-table tbody');tbody.replaceChildren();
    for(const r of rows.slice(Math.max(0,limit-50),limit)){
     const tr=document.createElement('tr');const name=document.createElement('td');name.textContent=r.name||`${r.scientificAsPrinted} / ${r.japaneseRomanizedAsPrinted}`;const island=document.createElement('td');island.textContent=r.island||'奄美群島（島別照合中）';const ref=document.createElement('td');const a=document.createElement('a');a.href=sources[r.source].url+'#page='+r.pdfPage;a.target='_blank';a.rel='noopener noreferrer';a.textContent=sources[r.source].title+' / PDF p.'+r.pdfPage+' ↗';ref.append(a);tr.append(name,island,ref);tbody.append(tr);
    }
    $('#record-table').hidden=rows.length===0;$('#record-count').textContent=`未照合の記録 ${rows.length.toLocaleString('ja-JP')}件 / ${rows.length?Math.min(limit-49,rows.length):0}〜${Math.min(limit,rows.length)}件を表示`;more.hidden=rows.length<=limit;load.hidden=true;
   }catch{$('#record-count').textContent='読み込めませんでした。通信を確認して再度お試しください。CSVでも確認できます。';load.hidden=false;load.textContent='もう一度読み込む';}
   finally{load.disabled=false;}
  }
  if(recordParams.has('record-q'))show();
  load.addEventListener('click',()=>show());recordForm.addEventListener('submit',e=>{e.preventDefault();show()});more.addEventListener('click',async()=>{limit+=50;await show(false);$('#record-table').setAttribute('tabindex','-1');$('#record-table').focus()});
 }
})();
