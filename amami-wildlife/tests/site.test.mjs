import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import worker from '../worker.mjs';
const root=path.resolve(import.meta.dirname,'..');const publicRoot=path.join(root,'public');
const species=JSON.parse(fs.readFileSync(path.join(root,'data/species.json')));
const sources=JSON.parse(fs.readFileSync(path.join(root,'data/sources.json')));
const records=JSON.parse(fs.readFileSync(path.join(root,'data/checklist-records.json')));
const mock={ASSETS:{async fetch(req){const p=path.join(publicRoot,new URL(req.url).pathname);if(!fs.existsSync(p)||fs.statSync(p).isDirectory())return new Response('missing',{status:404});const ext=path.extname(p);return new Response(req.method==='HEAD'?null:fs.readFileSync(p),{headers:{'Content-Type':ext==='.html'?'text/html; charset=utf-8':ext==='.json'?'application/json':'application/octet-stream'}});}}};
const request=(p,opts)=>worker.fetch(new Request('https://shima-craft.com'+p,opts),mock);
test('editorial entries have unique slugs, sources, pages and no invented images',()=>{
 assert.equal(new Set(species.map(s=>s.id)).size,species.length);
 assert.equal(new Set(species.map(s=>s.scientific)).size,species.length);
 for(const s of species){assert.match(s.id,/^[a-z0-9-]+$/);assert.ok(s.sources.every(k=>sources[k]));assert.ok(fs.existsSync(path.join(publicRoot,'wildlife/species',s.id,'index.html')));if(s.asset)assert.ok(fs.existsSync(path.join(publicRoot,'wildlife/assets/animals',s.asset+'.webp')));}
});
test('document records remain explicitly unreviewed, traceable and separate from species count',()=>{
 assert.ok(records.length>1100);assert.equal(records.filter(r=>r.source==='dragonflies').length,56);
 for(const r of records){assert.equal(r.review,'unreviewed');assert.ok(sources[r.source]);assert.ok(Number.isInteger(r.pdfPage)&&r.pdfPage>0);}
});
test('all internal links and images resolve; headings, language and alt attributes exist',()=>{
 const visit=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?visit(path.join(dir,d.name)):[path.join(dir,d.name)]);
 for(const p of visit(publicRoot).filter(p=>p.endsWith('.html'))){const html=fs.readFileSync(p,'utf8');assert.match(html,/<html lang="ja">/);assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.match(html,/class="skip"/);assert.match(html,/rel="canonical"/);
  for(const m of html.matchAll(/(?:href|src)="(\/wildlife\/[^"?#]*)(?:[?#][^"]*)?"/g)){let target=path.join(publicRoot,m[1]);if(m[1].endsWith('/'))target=path.join(target,'index.html');assert.ok(fs.existsSync(target),`${p}: ${m[1]}`);}
  for(const m of html.matchAll(/<img\b[^>]*>/g)){assert.match(m[0],/alt="/);assert.match(m[0],/width="\d+"/);assert.match(m[0],/height="\d+"/);}
 }
});
test('worker serves every editorial detail and applies security headers',async()=>{
 for(const s of species){const r=await request('/wildlife/species/'+s.id+'/');assert.equal(r.status,200);assert.match(await r.text(),new RegExp(s.name));assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.match(r.headers.get('Cache-Control'),/no-transform/);}
});
test('worker canonicalizes directory paths and retains filter query',async()=>{
 let r=await request('/wildlife?q=カエル');assert.equal(r.status,308);assert.equal(new URL(r.headers.get('Location'),'https://shima-craft.com').searchParams.get('q'),'カエル');r=await request('/wildlife/species/lidths-jay');assert.equal(r.status,308);assert.equal(r.headers.get('Location'),'/wildlife/species/lidths-jay/');
});
test('worker rejects mutations, unknown paths and encoded slash; no catch-all site route',async()=>{
 assert.equal((await request('/wildlife/',{method:'POST'})).status,405);
 assert.equal((await request('/studio')).status,404);
 assert.equal((await request('/wildlife/species/unknown/')).status,404);
 assert.equal((await request('/wildlife/assets%2fsecret')).status,404);
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc')));assert.equal(config.account_id,'42f69e35f08bb21dca5194467e2f59de');assert.ok(config.routes.every(r=>r.pattern.includes('/wildlife')));assert.ok(config.routes.every(r=>r.zone_id==='cdfc2875eb9e0bf217159ec8be376373'));
});
test('HEAD and missing pages preserve correct behavior',async()=>{
 const r=await request('/wildlife/',{method:'HEAD'});assert.equal(r.status,200);assert.equal(await r.text(),'');const missing=await request('/wildlife/missing/');assert.equal(missing.status,404);assert.equal(missing.headers.get('X-Robots-Tag'),'noindex');assert.match(await missing.text(),/ページが見つかりません/);
});
test('no credentials, trackers or remote scripts in public payload',()=>{
 const js=fs.readFileSync(path.join(publicRoot,'wildlife/assets/app.js'),'utf8');assert.doesNotMatch(js,/innerHTML|eval\(|gtag\(|googletagmanager|G-[A-Z0-9]{6,}|AIza|oauth_token|PRIVATE KEY/);const html=fs.readFileSync(path.join(publicRoot,'wildlife/index.html'),'utf8');assert.doesNotMatch(html,/<script[^>]+src="https?:/);assert.match(html,/SHIMA CRAFTへ/);assert.match(html,/イラスト追加/);
});
test('real photographs have reusable licenses, attribution, reviewed identities and local assets',()=>{
 const photos=JSON.parse(fs.readFileSync(path.join(root,'data/photos.json')));assert.equal(Object.keys(photos).length,species.length);
 for(const[id,p]of Object.entries(photos)){assert.ok(species.find(s=>s.id===id));assert.ok(p.visualReviewed);assert.match(p.license,/^(CC BY|CC0|Public domain|政府標準利用規約)/);assert.match(p.licenseUrl,/^https:\/\//);assert.match(p.sourcePage,/^https:\/\/(commons.wikimedia.org|www.inaturalist.org|kyushu.env.go.jp)\//);assert.ok(p.author);assert.ok(fs.existsSync(path.join(publicRoot,p.src)));const html=fs.readFileSync(path.join(publicRoot,'wildlife/species',id,'index.html'),'utf8');assert.ok(html.includes(p.src));assert.match(html,/role="tablist"/);assert.match(html,/2 実際の写真/);assert.match(html,/写真の出典/);}
});
test('latest requested white background, text-only brand, factual headings and ant revision are retained',()=>{
 const html=fs.readFileSync(path.join(publicRoot,'wildlife/index.html'),'utf8');const css=fs.readFileSync(path.join(publicRoot,'wildlife/assets/style.css'),'utf8');assert.match(html,/奄美大島の生き物大全/);assert.doesNotMatch(html,/brand-mark|だれがいる|みーつけた/);assert.match(css,/--paper:#ffffff/);assert.doesNotMatch(css,/background-image:url/);assert.equal(species.find(s=>s.id==='camponotus-amamianus').asset,'cute-camponotus-amamianus-v3');
});
test('rejected anatomy variants cannot be selected and revised art has a visual review record',()=>{
 const reviews=JSON.parse(fs.readFileSync(path.join(root,'docs/illustration-review.json')));
 const art=JSON.parse(fs.readFileSync(path.join(root,'data/illustrations.json')));
 for(const [id,asset] of Object.entries({'banded-gecko':'cute-banded-gecko-v3',habu:'cute-habu-v4',himehabu:'cute-himehabu-v4','lidths-jay':'cute-lidths-jay-v2'})){
  assert.equal(species.find(s=>s.id===id).asset,asset);
  assert.ok(reviews.some(r=>r.id===id&&r.master===art[asset].master&&r.visualReviewed&&r.accepted));
  assert.ok(art[asset].alpha);assert.ok(art[asset].width>0&&art[asset].height>0);
 }
 assert.ok(species.every(s=>s.asset),'All current editorial entries should have an illustration');
 assert.match(species.find(s=>s.id==='lidths-jay').fact,/カラス科/);
});
test('requested inventory preserves whales and distinguishes unverified candidates from editorial entries',()=>{
 const candidates=JSON.parse(fs.readFileSync(path.join(root,'data/requested-taxa.json')));
 assert.equal(new Set(candidates.map(r=>r.name)).size,candidates.length);
 for(const name of ['ザトウクジラ','マッコウクジラ','ハイ','セアカゴケグモ'])assert.ok(candidates.some(r=>r.name===name));
 for(const c of candidates){if(c.status==='editorial-entry-exists')assert.ok(species.some(s=>s.id===c.entryId&&s.name===c.name));else assert.equal(c.status,'source-verification-pending');}
 assert.ok(candidates.find(c=>c.name==='ハイ').note.includes('重複'));
});

test('picturebook preserves native catalogue links, pause, three chapters and static fallback',()=>{
 const html=fs.readFileSync(path.join(publicRoot,'wildlife/index.html'),'utf8');
 for(const entry of species)assert.ok(html.includes(`/wildlife/species/${entry.id}/`));
 for(const id of ['forest','river','sea','motion-toggle','nature-book','book-tab-0','book-tab-1','book-tab-2'])assert.ok(html.includes(`id="${id}"`));
 assert.match(html,/<noscript>/);assert.match(html,/本をひらく/);assert.match(html,/2 実際の写真/);assert.match(html,/<dialog/);
 assert.doesNotMatch(html,/assets\/journey.js/);
});
test('new photos preserve source class and disclose specimens or uncertain subspecies',()=>{
 const photos=JSON.parse(fs.readFileSync(path.join(root,'data/photos.json')));
 for(const id of ['tokunoshima-spiny-rat','amami-stag','uke-stag']){assert.equal(photos[id].provenance,'government-site-terms');assert.equal(photos[id].creditLabel,'出典');assert.equal(photos[id].licenseUrl,'https://kyushu.env.go.jp/help.html');}
 assert.match(photos['amami-deer-stag'].caption,/標本/);
 for(const id of ['black-wood-pigeon','ryukyu-scops-owl']){assert.ok(photos[id].subspeciesUnconfirmed);assert.match(photos[id].caption,/亜種.*未確認/);}
});
test('public asset URLs match current content hashes so cached old scripts and photos are not reused',()=>{
 const html=fs.readFileSync(path.join(publicRoot,'wildlife/index.html'),'utf8');
 let count=0;
 for(const match of html.matchAll(/(?:href|src)="(\/wildlife\/assets\/[^\"]+)"/g)){
  const url=new URL(match[1],'https://shima-craft.com');
  const file=path.join(publicRoot,url.pathname);
  const expected=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);
  assert.equal(url.searchParams.get('v'),expected);count++;
 }
 assert.ok(count>=10);
});

test('catalogue keeps every taxon in its own labelled section without mixed groups',()=>{
 const html=fs.readFileSync(path.join(publicRoot,'wildlife/index.html'),'utf8');
 const sections=[...html.matchAll(/<section class="taxon-section"[^>]*data-group="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
 assert.deepEqual(sections.map(m=>m[1]),['哺乳類','鳥類','爬虫類','両生類','昆虫']);
 const ids=[];
 for(const match of sections){const entries=[...match[2].matchAll(/data-id="([^"]+)"/g)].map(m=>m[1]);for(const id of entries)assert.equal(species.find(s=>s.id===id)?.group,match[1]);ids.push(...entries);assert.match(match[2],/<h3/);assert.match(match[2],/<h4/);}
 assert.equal(ids.length,species.length);assert.equal(new Set(ids).size,species.length);
});
test('both sea turtles have distinct sourced entries, local art and actual photo tabs',()=>{
 for(const id of ['green-turtle','loggerhead-turtle']){const s=species.find(s=>s.id===id);assert.equal(s.group,'爬虫類');assert.equal(s.habitat,'海・海岸');const html=fs.readFileSync(path.join(publicRoot,'wildlife/species',id,'index.html'),'utf8');assert.match(html,/2 実際の写真/);assert.ok(html.includes(s.scientific));}
 assert.equal(species.find(s=>s.id==='loggerhead-turtle').scientific,'Caretta caretta');
 assert.ok(species.find(s=>s.id==='loggerhead-turtle').sources.includes('amami-turtles-atlas'));
});

test('snake selections require structural underdrawing and explicit post-generation topology review',()=>{
 const reviews=JSON.parse(fs.readFileSync(path.join(root,'docs/illustration-review.json')));
 const choices=JSON.parse(fs.readFileSync(path.join(root,'data/illustration-choices.json')));
 for(const id of ['habu','himehabu','akamata','green-snake','coral-snake']){const entry=species.find(s=>s.id===id);assert.equal(entry.asset,choices[id]);const review=reviews.findLast(r=>r.id===id&&r.accepted);assert.ok(fs.existsSync(path.join(root,review.structureGuide)));for(const value of Object.values(review.reviewChecks))assert.equal(value,true);}
});
