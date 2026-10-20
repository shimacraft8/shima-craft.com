import test from 'node:test';
import assert from 'node:assert/strict';
import { createCycloneProvider, parseCyclones, CYCLONE_LIST } from '../server/cyclones.mjs';
import { createHomeWorker } from '../worker/index.mjs';
const start=Date.parse('2026-10-20T22:00:00+09:00');
const target={tropicalCyclone:'TC2636',typhoonNumber:'2630',category:'TY',issue:'2026-10-20T21:50:00+09:00'};
const filename='20261020110631_0_Z__C_010000_20261020090000_MET_CHT_JCIspas_JCP600x581_JRcolor_Tjmahp_image.png';
const response=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
test('strict list rejects malformed, duplicate, future or unknown targets rather than reporting none',()=>{
 for(const value of [{},[target,target],[{...target,category:'NEW'}],[{...target,issue:'2027-01-01'}],[{...target,tropicalCyclone:'../../x'}]]) assert.throws(()=>parseCyclones(value,start));
 assert.equal(parseCyclones([{...target,typhoonNumber:null,category:'TD'}],start)[0].category,'TD');
});
test('empty means successful current check, never a failed retrieval of an empty cache',async()=>{
 let now=start,fail=false,calls=0;
 const provider=createCycloneProvider({clock:()=>new Date(now),fetcher:async()=>{calls++;if(fail)throw new Error('network');return response([]);}});
 const initial=await provider.get();assert.equal(initial.status,'empty');assert.deepEqual(initial.data,[]);
 await provider.get();assert.equal(calls,1);now+=300_001;fail=true;
 assert.equal((await provider.get()).status,'refresh-failed');
 const cold=createCycloneProvider({fetcher:async()=>{throw new Error('offline');}});assert.equal((await cold.get()).status,'unavailable');
});
test('active list is replaced on removal, coalesces retrieval and reports old issues as stale',async()=>{
 let now=start,data=[target],calls=0;
 const provider=createCycloneProvider({clock:()=>new Date(now),fetcher:async url=>{calls++;return response(url===CYCLONE_LIST ? data : {near:{now:[filename]}});}});
 const [a,b]=await Promise.all([provider.get(),provider.get()]);assert.equal(a.status,'ready');assert.deepEqual(a,b);assert.equal(calls,2);assert.equal(a.chart.version,filename);
 data=[];now+=300_001;assert.equal((await provider.get()).status,'empty');assert.equal((await provider.get()).chart,null);
 now+=7*3600_000;data=[target];assert.equal((await provider.get()).status,'stale');
});
test('image failure and untrusted filenames never create a false no-storm result or an open proxy',async()=>{
 let images=0;
 const provider=createCycloneProvider({clock:()=>new Date(start),fetcher:async url=>{if(url.endsWith('.png')){images++;return new Response('not a png');}return response(url===CYCLONE_LIST ? [target] : {near:{now:['https://evil.invalid/a.png',filename]}});}});
 assert.equal((await provider.get()).status,'ready');assert.equal(await provider.image('https://evil.invalid/a.png'),null);assert.equal(images,0);
 assert.equal(await provider.image(filename),null);assert.equal(images,1);assert.equal((await provider.get()).status,'ready');
});
test('weather chart is version-bound and older charts are hidden',async()=>{
 const image=new Uint8Array(24);image.set([137,80,78,71,13,10,26,10]);new DataView(image.buffer).setUint32(16,600);new DataView(image.buffer).setUint32(20,581);
 const fetcher=async url=>url.endsWith('.png') ? new Response(image) : response(url===CYCLONE_LIST ? [target] : {near:{now:[filename]}});
 const provider=createCycloneProvider({clock:()=>new Date(start),fetcher});await provider.get();assert.equal((await provider.image(filename)).length,24);
 const old=createCycloneProvider({clock:()=>new Date(start+3*3600_000),fetcher});assert.equal((await old.get()).chart,null);
});
test('homepage routes list and chart without affecting other hazard claims or allowing methods',async()=>{
 const cyclones={get:async()=>({schemaVersion:1,status:'empty',data:[]}),image:async()=>null};
 const worker=createHomeWorker({cyclones});const env={};
 const a=await worker.fetch(new Request('https://shima-craft.com/amami-life-api/cyclones'),env);assert.equal((await a.json()).status,'empty');
 assert.equal((await worker.fetch(new Request('https://shima-craft.com/amami-life-api/cyclones/chart?version=x'),env)).status,410);
 assert.equal((await worker.fetch(new Request('https://shima-craft.com/amami-life-api/cyclones',{method:'POST'}),env)).status,405);
 assert.equal((await (await worker.fetch(new Request('https://shima-craft.com/amami-life-api/service-health'),env)).json()).currentHazardsIntegrated,false);
});
