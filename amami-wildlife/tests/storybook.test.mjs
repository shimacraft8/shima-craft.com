import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pageIndex,swipePage,scrollProgress,chapterForSpot} from '../src/storybook/model.js';
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
test('picturebook swipes advance left, retreat right and leave vertical/pinch gestures alone',()=>{
 assert.equal(swipePage(-70,8),1);assert.equal(swipePage(70,8),-1);
 for(const [x,y] of [[20,0],[50,50],[5,120],[NaN,0],[Infinity,2]])assert.equal(swipePage(x,y),0);
 assert.equal(pageIndex(-1),0);assert.equal(pageIndex(3),2);assert.equal(pageIndex('1'),1);assert.equal(pageIndex(1.5),0);
});
test('native scroll progress is finite and bounded without grabbing scroll input',()=>{
 assert.equal(scrollProgress(900,1200,800,150),0);assert.equal(scrollProgress(150,1200,800,150),0);
 assert.equal(scrollProgress(-125,1200,800,150),.5);assert.equal(scrollProgress(-999,1200,800,150),1);
 assert.equal(scrollProgress(-500,300,800,150),1);
 const source=fs.readFileSync(new URL('../src/storybook/index.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/addEventListener\(['"](?:wheel|touchmove)['"]/);assert.match(source,/\{passive:true\}/);
});
test('legacy habitat links map to the matching story rather than losing the destination',()=>{
 for(const spot of ['hego','floor','cape'])assert.equal(chapterForSpot(spot),'forest');
 for(const spot of ['falls','stream'])assert.equal(chapterForSpot(spot),'river');
 for(const spot of ['shore','estuary'])assert.equal(chapterForSpot(spot),'sea');assert.equal(chapterForSpot('invalid'),null);
});
test('three story scenes use existing sourced species and locally reviewed original art',()=>{
 const scenes=json('data/story-scenes.json'),species=json('data/species.json'),art=json('data/story-art.json');
 assert.deepEqual(scenes.map(s=>s.id),['forest','river','sea']);
 for(const s of scenes){for(const id of [s.main,...s.related])assert.ok(species.some(a=>a.id===id));
  for(const width of ['', '-768'])assert.ok(fs.existsSync(new URL('../public/wildlife/assets/storybook/'+s.background+width+'.webp',import.meta.url)));
 }
 assert.equal(Object.keys(art).length,3);for(const plate of Object.values(art)){assert.equal(plate.visualReviewed,true);assert.ok(fs.existsSync(new URL('../'+plate.master,import.meta.url)));}
});
test('dialog tab panels are paired and photo is loaded on demand, not as a fabricated fallback',()=>{
 const html=fs.readFileSync(new URL('../public/wildlife/index.html',import.meta.url),'utf8');
 for(let i=0;i<3;i++){assert.match(html,new RegExp(`id="book-tab-${i}" aria-controls="book-panel-${i}"`));assert.match(html,new RegExp(`id="book-panel-${i}"[^>]+aria-labelledby="book-tab-${i}"`));}
 assert.doesNotMatch(html,/src=""/);assert.match(html,/srcset="[^\"]+-768.webp\?v=/);
 const source=fs.readFileSync(new URL('../src/storybook/index.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/innerHTML|eval\(/);assert.match(source,/写真を読み込めませんでした/);assert.match(source,/history\.pushState/);assert.match(source,/popstate/);
});

test('interactive page turns choose the nearest real page and clamp rapid endpoint requests',async()=>{
 const {slideIndex,nearestSlide,slideOffset,bookProgress}=await import('../src/storybook/model.js');
 assert.equal(slideIndex(-2,5),0);assert.equal(slideIndex(99,5),4);assert.equal(slideIndex(NaN,5),0);
 assert.equal(nearestSlide(1499,1000,5),1);assert.equal(nearestSlide(1501,1000,5),2);assert.equal(nearestSlide(500,0,5),0);
 assert.equal(slideOffset(1000,500,1000),.5);assert.equal(slideOffset(1000,500,0),0);
 assert.equal(bookProgress(0,5),0);assert.equal(bookProgress(4,5),1);
});
test('chapter URLs preserve the catalogue filters and legacy fragment/spot destinations',async()=>{
 const {chapterFromTarget,chapterUrl}=await import('../src/storybook/model.js');const ids=['cover','forest','river','sea','end'];
 assert.equal(chapterFromTarget('?chapter=sea','#forest',ids),'sea');
 assert.equal(chapterFromTarget('','#colophon',ids),'end');assert.equal(chapterFromTarget('?spot=falls','',ids),'river');
 assert.equal(chapterFromTarget('?chapter=unknown','#catalog',ids),null);
 const url=chapterUrl('https://shima-craft.com/wildlife/?q=カエル&all=1#forest','sea','cover');
 assert.equal(url.searchParams.get('q'),'カエル');assert.equal(url.searchParams.get('all'),'1');assert.equal(url.searchParams.get('chapter'),'sea');assert.equal(url.hash,'');
 assert.equal(chapterUrl(url.href,'cover','cover').searchParams.has('chapter'),false);
});
test('interactive stage has a cover and real anchor controls; no inline styles violate the production CSP',()=>{
 const html=fs.readFileSync(new URL('../public/wildlife/index.html',import.meta.url),'utf8');
 for(const id of ['cover','stage-track','stage-prev','stage-next','colophon'])assert.ok(html.includes(`id="${id}"`));
 assert.doesNotMatch(html,/\sstyle="/);assert.match(html,/tabindex="0" aria-label="奄美の生き物絵本"/);
 assert.match(html,/href="#catalog"/);assert.match(html,/href="#forest"/);
});
