import { tideOverview } from './usage.js';
import { reviewHref } from './legacy-links.js';
const business=/^\/(?:studio|about|services|web-check|service|industry)(?:\/|$)/.test(location.pathname);
const studio=location.pathname.replace(/\/$/,'')==='/studio';
let scheduled=false,hashCancelled=false,tideScope=null,tideRequest=0;
const tideCache=new Map();
function repairLinks(){
 for(const a of document.querySelectorAll('a[href]')){
  if(a.closest('[data-shima-owned]'))continue;
  const href=a.getAttribute('href');
  if(business && href?.startsWith('mailto:') && a.textContent.trim()==='相談する'){a.setAttribute('href','/studio#contact');continue;}
  if(href==='/amami-road-quest' || href==='/amami-road-quest/'){a.hidden=true;a.setAttribute('aria-hidden','true');a.tabIndex=-1;continue;}
  const next=reviewHref(href,location.pathname);
  if(next!==href)a.setAttribute('href',next);
 }
}
function alignHash(){
 if(!studio || hashCancelled || !location.hash)return;
 let name;try{name=decodeURIComponent(location.hash.slice(1));}catch{return;}
 const target=document.getElementById(name);
 if(target){target.style.scrollMarginTop='100px';target.scrollIntoView({block:'start',behavior:'instant'});}
}
function installMenu(){
 if(!business || document.getElementById('shima-review-menu'))return;
 const host=document.createElement('div');host.dataset.shimaOwned='true';
 host.innerHTML='<button id="shima-review-menu" class="shima-review-menu" type="button" aria-expanded="false" aria-controls="shima-review-dialog">メニュー</button><dialog id="shima-review-dialog" class="shima-review-dialog" aria-labelledby="shima-menu-title"><form method="dialog"><h2 id="shima-menu-title">SHIMA CRAFT</h2><button aria-label="メニューを閉じる">閉じる</button></form><nav aria-label="制作サイトのメニュー">'+[['about','SHIMA CRAFTについて'],['service','サービス'],['works','制作例'],['price','料金'],['flow','制作の流れ'],['faq','よくある質問'],['contact','相談する']].map(([id,label])=>'<a href="/studio#'+id+'">'+label+' →</a>').join('')+'<a href="/amami-tide">奄美の潮と空 →</a><a href="/">AMAMI LIFE · 奄美の今日 →</a></nav></dialog>';
 document.body.append(host);
 const button=host.querySelector('button'),dialog=host.querySelector('dialog');
 button.addEventListener('click',()=>{dialog.showModal();button.setAttribute('aria-expanded','true');});
 dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');button.focus({preventScroll:true});});
}
function installStudioLinks(){
 if(!studio)return;
 const works=document.getElementById('works');
 if(works && !document.getElementById('shima-life-project')){
  const panel=document.createElement('aside');panel.id='shima-life-project';panel.className='shima-review-panel';panel.dataset.shimaOwned='true';
  panel.innerHTML='<p class="shima-review-kicker">自主制作・公開運用中</p><h3>AMAMI LIFE — 奄美の今日を、ひと目で。</h3><p>SHIMA CRAFTが開発・運営する地域情報ツールです。天気・潮汐・太陽と月、交通や防災の公式情報をまとめています。</p><a href="/">動いているAMAMI LIFEを見る →</a>';
  works.append(panel);
 }
 const header=document.querySelector('header');
 if(header && !header.querySelector('[data-life-link]')){const link=document.createElement('a');link.dataset.lifeLink='true';link.dataset.shimaOwned='true';link.className='shima-life-link';link.href='/';link.textContent='AMAMI LIFE · 奄美の今日 →';header.append(link);}
 const footer=document.querySelector('footer');if(footer && !footer.querySelector('[data-life-link]')){const link=document.createElement('a');link.dataset.lifeLink='true';link.dataset.shimaOwned='true';link.href='/';link.textContent='AMAMI LIFE（奄美の今日） →';link.className='shima-life-footer';footer.append(link);}
 const contact=document.getElementById('contact');
 if(contact && !contact.querySelector('[data-shima-contact]')){
  const panel=document.createElement('div');panel.className='shima-review-panel';panel.dataset.shimaOwned='true';panel.dataset.shimaContact='true';
  panel.innerHTML='<h3>相談内容をまとめる</h3><p>メールアプリがなくても、Gmailで相談内容の下書きを作成できます。ここでは送信されません。開いたGmailで内容を確認して送信してください。</p><form id="shima-contact-draft"><label>お名前<input name="name" autocomplete="name" required maxlength="100"></label><label>返信先メールアドレス<input name="reply" type="email" inputmode="email" spellcheck="false" autocomplete="email" required maxlength="254"></label><label>相談内容<textarea name="message" autocomplete="off" rows="5" required maxlength="3000"></textarea></label><button type="submit">Gmailで下書きを作る →</button><button type="button" data-copy-draft>相談内容をコピー</button><p role="status" id="shima-contact-status"></p></form><p>入力内容はこの画面内だけで扱います。Gmailを開いたときにGoogleへ渡されます。Gmailを使わない場合は内容をコピーし、下のメールアドレスへお送りください。</p><button type="button" data-copy-address>メールアドレスをコピー</button>';
  const lead=contact.querySelector('.lead');if(lead)lead.after(panel);else contact.prepend(panel);
  const form=panel.querySelector('form'),status=panel.querySelector('[role=status]');
  const draft=()=>{const fields=new FormData(form);return 'お名前：'+fields.get('name')+'\n返信先：'+fields.get('reply')+'\n\n相談内容：\n'+fields.get('message');};
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const url=new URL('https://mail.google.com/mail/');url.search=new URLSearchParams({view:'cm',fs:'1',to:'shimacraft8@gmail.com',su:'SHIMA CRAFTへのご相談',body:draft()});const opened=window.open(url.href,'_blank','noopener,noreferrer');status.textContent=opened===null ? 'Gmailが開かない場合は「相談内容をコピー」をご利用ください。' : 'Gmailで内容を確認して送信してください。';});
  panel.querySelector('[data-copy-draft]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(draft());status.textContent='相談内容をコピーしました。まだ送信されていません。';}catch{status.textContent='コピーできませんでした。入力内容を選択してコピーしてください。';}});
  panel.querySelector('[data-copy-address]').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('shimacraft8@gmail.com');status.textContent='メールアドレスをコピーしました。';}catch{status.textContent='shimacraft8@gmail.com をコピーしてください。';}});
 }
}
async function repairTide(){
 if(location.pathname.replace(/\/$/,'')!=='/amami-tide')return;
 if(!document.getElementById('shima-tide-brand')){const brand=document.createElement('p');brand.id='shima-tide-brand';brand.dataset.shimaOwned='true';brand.innerHTML='<a href="/">AMAMI LIFE by SHIMA CRAFT · 奄美の今日 →</a>';document.querySelector('main')?.prepend(brand);}
 const params=new URLSearchParams(location.search),date=params.get('date')??new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
 if(tideScope===date)return;tideScope=date;const id=++tideRequest;
 const targets=Array.from(document.querySelectorAll('span')).filter(el=>/^(?:次の|この日の)(?:満潮|干潮)/.test(el.textContent.trim()));
 if(targets.length!==2){tideScope=null;return;}
 for(const label of targets){label.parentElement.querySelector('strong').textContent='確認中…';label.parentElement.querySelector('p').textContent='共通の潮位予測を取得中';}
 try{
  let p=tideCache.get(date);if(!p){const response=await fetch('/amami-life-api/today?area=naze&date='+encodeURIComponent(date),{signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('tide fetch');p=await response.json();if(tideCache.size>=2)tideCache.delete(tideCache.keys().next().value);tideCache.set(date,p);}
  if(id!==tideRequest)return;
  if(p.schemaVersion!==1 || p.mode!=='reference' || p.data?.date!==date || p.data.area?.id!=='naze')throw Error('invalid tide');
  const model=tideOverview(p.data.tide,p.data.tomorrowTide,new Date()),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date());
  for(const label of targets){const high=label.textContent.includes('満潮'),value=high?model.high:model.low;label.textContent=(date===today?'次の':'この日の')+(high?'満潮':'干潮')+(value?.date!==date&&value?'（翌日）':'');label.parentElement.querySelector('strong').textContent=value?.time??'—';label.parentElement.querySelector('p').textContent=value?value.heightCm+' cm · 名瀬小湊の潮位予測':'この日付の予測は表示できません';}
  if(!document.getElementById('shima-tide-common-source')){const note=document.createElement('p');note.id='shima-tide-common-source';note.dataset.shimaOwned='true';note.className='shima-review-note';note.textContent='次の満潮・干潮はAMAMI LIFEと同じ予測データで表示しています。実測ではありません。データ取得：'+(p.data.tideSource?.fetchedAt??'日時不明');targets[0].parentElement.parentElement.after(note);}
 }catch{if(id!==tideRequest)return;for(const label of targets){label.parentElement.querySelector('strong').textContent='—';label.parentElement.querySelector('p').textContent='更新できません。AMAMI LIFEか気象庁で確認してください。';}}
 for(const label of document.querySelectorAll('span'))if(label.textContent.trim()==='天気予報' && label.parentElement.textContent.includes('--')&&!label.parentElement.querySelector('[data-missing-temp]')){const note=document.createElement('p');note.dataset.missingTemp='true';note.textContent='最高・最低気温は発表・取得できた日のみ表示します。— は0℃ではありません。';label.parentElement.append(note);}
}
function repairPrices(){
 if(!studio)return;
 for(const section of [document.getElementById('price'),document.getElementById('faq')].filter(Boolean)){
  const walker=document.createTreeWalker(section,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){let next=node.textContent.replace(/(\d{4,})(?=円)/g,v=>Number(v).toLocaleString('ja-JP'));if(section.id==='price')next=next.replace(/150,000円(?![〜～])/g,'150,000円〜');if(next!==node.textContent)node.textContent=next;}
 }
}
function markPastActivities(){
 if(location.pathname.replace(/\/$/,'')!=='/amami-tide')return;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo'}).format(new Date()),chosen=new URLSearchParams(location.search).get('date')??today;
 if(chosen!==today)return;
 const now=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
 for(const card of document.querySelectorAll('article[class*="activityCard"]')){const range=card.querySelector('strong')?.textContent.match(/(\d{2}:\d{2})[〜～~](\d{2}:\d{2})/);if(range && range[2]<now && !card.querySelector('[data-time-ended]')){const note=document.createElement('p');note.dataset.timeEnded='true';note.textContent='表示の時間帯は終了しました';card.append(note);}}
}
function repair(){scheduled=false;if(location.pathname==='/demo03' && document.title!=='宿泊予約管理の画面サンプル｜SHIMA CRAFT')document.title='宿泊予約管理の画面サンプル｜SHIMA CRAFT';if(document.title.includes('｜SHIMA CRAFT｜SHIMA CRAFT'))document.title=document.title.replace('｜SHIMA CRAFT｜SHIMA CRAFT','｜SHIMA CRAFT');markPastActivities();repairLinks();installMenu();installStudioLinks();repairPrices();void repairTide();}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(repair);}}
function start(){
 if(business)document.body.dataset.shimaBusiness='true';
 repair();setInterval(()=>{if(!document.hidden){tideScope=null;void repairTide();markPastActivities();}},60000);const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
 for(const ms of [0,200,700,1600,3200])setTimeout(alignHash,ms);
 window.addEventListener('wheel',()=>{hashCancelled=true;},{passive:true,once:true});window.addEventListener('touchstart',()=>{hashCancelled=true;},{passive:true,once:true});
 window.addEventListener('hashchange',()=>{hashCancelled=false;alignHash();});
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');if(!a || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || a.target==='_blank' || a.hasAttribute('download'))return;
  const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;
  if(a.closest('[data-shima-owned]') && url.pathname==='/')return;
  if(url.pathname===location.pathname && url.hash){event.preventDefault();event.stopImmediatePropagation();document.getElementById('shima-review-dialog')?.close();history.pushState(null,'',url);hashCancelled=false;alignHash();document.getElementById(url.hash.slice(1))?.scrollIntoView({block:'start'});return;}
  if(url.pathname!==location.pathname || url.search!==location.search){event.preventDefault();event.stopImmediatePropagation();location.assign(url.href);}
 },true);
}
// The legacy intro is removed by React after its first committed effects.
// Wait for that observable lifecycle signal before modifying managed content.
function afterLegacyReady(){
 if(!studio || !document.querySelector('.intro')){start();return;}
 const readyObserver=new MutationObserver(()=>{if(!document.querySelector('.intro')){readyObserver.disconnect();start();}});
 readyObserver.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='complete')afterLegacyReady();else window.addEventListener('load',afterLegacyReady,{once:true});
