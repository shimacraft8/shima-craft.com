import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
 for(const s of species){const r=await request('/wildlife/species/'+s.id+'/');assert.equal(r.status,200);assert.match(await r.text(),new RegExp(s.name));assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');}
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
 const photos=JSON.parse(fs.readFileSync(path.join(root,'data/photos.json')));assert.equal(Object.keys(photos).length,30);
 for(const[id,p]of Object.entries(photos)){assert.ok(species.find(s=>s.id===id));assert.ok(p.visualReviewed);assert.match(p.license,/^(CC BY|CC0|Public domain)/);assert.match(p.licenseUrl,/^https:\/\//);assert.match(p.sourcePage,/^https:\/\/commons.wikimedia.org\//);assert.ok(p.author);assert.ok(fs.existsSync(path.join(publicRoot,p.src)));const html=fs.readFileSync(path.join(publicRoot,'wildlife/species',id,'index.html'),'utf8');assert.ok(html.includes(p.src));assert.match(html,/role="tablist"/);assert.match(html,/2 実際の写真/);assert.match(html,/写真の出典/);}
});
test('latest requested white background, text-only brand, factual headings and ant revision are retained',()=>{
 const html=fs.readFileSync(path.join(publicRoot,'wildlife/index.html'),'utf8');const css=fs.readFileSync(path.join(publicRoot,'wildlife/assets/style.css'),'utf8');assert.match(html,/奄美大島の生き物大全/);assert.doesNotMatch(html,/brand-mark|だれがいる|みーつけた/);assert.match(css,/--paper:#ffffff/);assert.doesNotMatch(css,/background-image:url/);assert.equal(species.find(s=>s.id==='camponotus-amamianus').asset,'cute-camponotus-amamianus-v2');
});
test('rejected anatomy variants cannot be selected and revised art has a visual review record',()=>{
 const reviews=JSON.parse(fs.readFileSync(path.join(root,'docs/illustration-review.json')));
 const art=JSON.parse(fs.readFileSync(path.join(root,'data/illustrations.json')));
 for(const [id,asset] of Object.entries({'banded-gecko':'cute-banded-gecko-v3',habu:'cute-habu-v2',himehabu:'cute-himehabu-v2','lidths-jay':'cute-lidths-jay-v2'})){
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
