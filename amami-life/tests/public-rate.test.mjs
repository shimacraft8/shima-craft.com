import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicLimiter } from '../worker/rate-limit.mjs';
test('public limiter expires windows and caps unique keys',async()=>{
  let now=0; const limit=createPublicLimiter({clock:()=>now,limit:1,maxKeys:1});
  const request=(ip)=>new Request('https://shima-craft.com/amami-life-api/today',{headers:{'cf-connecting-ip':ip}});
  assert.equal(await limit(request('one'),{}),null);
  const denied=await limit(request('one'),{});assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'60');
  assert.equal((await limit(request('two'),{})).status,503);
  now=60000;assert.equal(await limit(request('two'),{}),null);
});
test('native shared-location binding is used and failure does not silently allow traffic',async()=>{
  const limit=createPublicLimiter(),request=new Request('https://shima-craft.com/amami-life-api/today');
  assert.equal((await limit(request,{PUBLIC_API_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
  assert.equal((await limit(request,{PUBLIC_API_RATE_LIMITER:{limit:async()=>{throw Error('unavailable');}}})).status,503);
  assert.equal(await limit(request,{PUBLIC_API_RATE_LIMITER:{limit:async()=>({success:true})}}),null);
});

// Exercise the Worker boundary too: limits retain safety headers and HEAD semantics.
test('worker rate response keeps headers and does not proxy to the old site',async()=>{
 const {createHomeWorker}=await import('../worker/index.mjs');
 const worker=createHomeWorker();let proxied=false;
 const response=await worker.fetch(new Request('https://shima-craft.com/amami-life-api/today',{method:'HEAD'}),{PUBLIC_API_RATE_LIMITER:{limit:async()=>({success:false})},SHIMA_ORIGIN:{fetch:async()=>{proxied=true;throw Error('unexpected');}}});
 assert.equal(response.status,429);assert.equal(await response.text(),'');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(proxied,false);
});
