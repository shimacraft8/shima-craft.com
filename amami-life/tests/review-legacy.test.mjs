import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewHref,rewriteLegacyHtml,reviewOriginResponse,isReviewPublicPath } from '../worker/legacy-review.mjs';
test('business home links and root sections return to studio without touching external links',()=>{
 for(const path of ['/services','/about','/web-check','/blog/post']){
  assert.equal(reviewHref('/',path),'/studio');assert.equal(reviewHref('/#contact',path),'/studio#contact');assert.equal(reviewHref('https://shima-craft.com/#price',path),'/studio#price');
 }
 assert.equal(reviewHref('https://elsewhere.example/#price','/about'),'https://elsewhere.example/#price');
 assert.equal(reviewHref('/?area=naze#today','/services'),'/?area=naze#today');
 assert.equal(reviewHref('mailto:shimacraft8@gmail.com','/about'),'mailto:shimacraft8@gmail.com');
 assert.equal(isReviewPublicPath('/api/contact'),false);assert.equal(isReviewPublicPath('/admin'),false);
});
test('legacy presentation edits do not rewrite serialized script data or inject twice',()=>{
 const source='<html><head></head><body><a href="/">トップ</a><script>const s=\'<a href="/">serialized</a>\';</script><script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script></body></html>';
 const html=rewriteLegacyHtml(source,'/services');assert.match(html,/<a href="\/studio">トップ/);assert.match(html,/const s='<a href="\/">serialized/);assert.doesNotMatch(html,/src="https:\/\/pagead2/);assert.equal((rewriteLegacyHtml(html,'/services').match(/data-shima-review/g)??[]).length,1);
});
test('legacy layer leaves POST/auth/json responses intact',async()=>{
 const request=new Request('https://shima-craft.com/api/contact',{method:'POST',body:'keep'}),response=new Response('unchanged',{status:202,headers:{'set-cookie':'keep=yes'}});
 assert.equal(await reviewOriginResponse(response,request),response);
 const json=new Response('{"keep":true}',{headers:{'Content-Type':'application/json'}});assert.equal(await reviewOriginResponse(json,new Request('https://shima-craft.com/services')),json);
});
test('retired quest is removed from sitemap without removing active tools',async()=>{
 const xml='<urlset><url><loc>https://shima-craft.com/amami-road-quest</loc><lastmod>2026-08-10</lastmod></url><url><loc>https://shima-craft.com/amami-tide</loc></url></urlset>';
 const result=await reviewOriginResponse(new Response(xml,{headers:{'Content-Type':'application/xml'}}),new Request('https://shima-craft.com/sitemap.xml'));const text=await result.text();assert.doesNotMatch(text,/road-quest/);assert.match(text,/amami-tide/);
});
