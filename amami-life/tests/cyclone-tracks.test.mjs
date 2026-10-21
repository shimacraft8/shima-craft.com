import test from 'node:test';
import assert from 'node:assert/strict';
import {createCycloneTrackProvider,parseCycloneTrack} from '../server/cyclone-tracks.mjs';
import {createHomeWorker} from '../worker/index.mjs';
const now=Date.parse('2026-10-21T12:50:00+09:00');
const target={id:'TC2636',number:'2630',category:'TY',issuedAt:'2026-10-21T03:45:00.000Z'};
const title={part:'title',issue:{JST:target.issuedAt},typhoonNumber:'2630',name:{jp:'試験用'}};
const point=(hours,center)=>({advancedHours:hours,center,validtime:{JST:new Date(Date.parse('2026-10-21T03:00:00Z')+hours*3600_000).toISOString()},...(hours ? {probabilityCircle:{radius:46300}} : {})});
const forecast=[title,point(0,[18.4,129.5]),point(12,[19.5,127.6])];
const specs=[title,...forecast.slice(1).map(p=>({advancedHours:p.advancedHours,validtime:p.validtime,position:{deg:p.center},pressure:'900',maximumWind:{sustained:{'m/s':'60'},gust:{'m/s':'85'}},category:{jp:'台風'}}))];
const clone=v=>structuredClone(v),response=value=>new Response(JSON.stringify(value));
const list={status:'ready',data:[target]};
test('official center coordinates, metres, horizons and values remain unchanged',()=>{
 const data=parseCycloneTrack(forecast,specs,target,now);assert.equal(data.points[1].radiusM,46300);assert.equal(data.points[0].lat,18.4);assert.equal(data.points[0].lon,129.5);assert.equal(data.points[1].windMs,60);assert.equal(data.points[0].radiusM,null);
});
test('mixed reports, malformed circles, impossible times and duplicate horizons fail closed',()=>{
 const cases=[f=>{f[0].issue.JST='2026-10-21T03:50:00Z';},f=>{f[2].probabilityCircle.radius=-1;},f=>{f[2].center=[129,18];},f=>{f[2].advancedHours=0;},f=>{f[2].validtime.JST='2026-10-23T00:00:00Z';}];
 for(const mutate of cases){const f=clone(forecast);mutate(f);assert.throws(()=>parseCycloneTrack(f,specs,target,now));}
 const s=clone(specs);s[2].position.deg=[20,128];assert.throws(()=>parseCycloneTrack(forecast,s,target,now));
});
test('TD without typhoon number and without future points is represented, optional numbers are never invented',()=>{
 const f=clone(forecast.slice(0,2)),s=clone(specs.slice(0,2));f[0].typhoonNumber=null;s[0].typhoonNumber=null;s[1].pressure='unknown';delete s[1].maximumWind;
 const data=parseCycloneTrack(f,s,{...target,number:null,category:'TD'},now);assert.equal(data.category,'TD');assert.equal(data.points.length,1);assert.equal(data.points[0].pressureHpa,null);assert.equal(data.points[0].windMs,null);
});
test('track calls coalesce, are fixed-host, cached, and removed storms cannot be queried',async()=>{
 let clock=now,calls=0,current=list;
 const provider=createCycloneTrackProvider({clock:()=>new Date(clock),cyclones:{get:async()=>current},fetcher:async url=>{assert.match(url,/^https:\/\/www\.jma\.go\.jp\/bosai\/typhoon\/data\/TC2636\/(forecast|specifications)\.json$/);calls++;return response(url.endsWith('/forecast.json') ? forecast : specs);}});
 const [a,b]=await Promise.all([provider.get('TC2636'),provider.get('TC2636')]);assert.deepEqual(a,b);assert.equal(a.status,'ready');assert.equal(calls,2);
 await provider.get('TC2636');assert.equal(calls,2);assert.equal((await provider.get('../../evil')).data,null);assert.equal((await provider.get('TC9999')).data,null);assert.equal(calls,2);
 clock+=300001;await provider.get('TC2636');assert.equal(calls,4);current={status:'empty',data:[]};assert.equal((await provider.get('TC2636')).data,null);assert.equal(calls,4);
});
test('cold errors are unavailable, cached failures stale, retry backoff and issue changes are enforced',async()=>{
 let clock=now,fail=false,calls=0,current=list;
 const provider=createCycloneTrackProvider({clock:()=>new Date(clock),cyclones:{get:async()=>current},fetcher:async url=>{calls++;if(fail)throw Error('offline');return response(url.endsWith('/forecast.json') ? forecast : specs);}});
 await provider.get('TC2636');fail=true;clock+=300001;const old=await provider.get('TC2636');assert.equal(old.status,'refresh-failed');assert.ok(old.data);const attempts=calls;await provider.get('TC2636');assert.equal(calls,attempts);
 current={status:'ready',data:[{...target,issuedAt:new Date(now+1000).toISOString()}]};assert.equal((await provider.get('TC2636')).status,'refresh-failed');assert.equal(calls,attempts+2);await provider.get('TC2636');assert.equal(calls,attempts+2);
 const cold=createCycloneTrackProvider({cyclones:{get:async()=>list},fetcher:async()=>{throw Error('offline');}});assert.equal((await cold.get('TC2636')).status,'unavailable');
});
test('old or stale upstream data is marked stale even after successful retrieval',async()=>{
 const provider=createCycloneTrackProvider({clock:()=>new Date(now+7*3600_000),cyclones:{get:async()=>list},fetcher:async url=>response(url.endsWith('/forecast.json') ? forecast : specs)});assert.equal((await provider.get('TC2636')).status,'stale');
 const p=createCycloneTrackProvider({clock:()=>new Date(now),cyclones:{get:async()=>({...list,status:'refresh-failed'})},fetcher:async url=>response(url.endsWith('/forecast.json') ? forecast : specs)});assert.equal((await p.get('TC2636')).status,'stale');
});
test('redirects, large payloads and mismatched issues never become a ready map',async()=>{
 for(const fetcher of [async()=>new Response(null,{status:302}),async()=>new Response('x'.repeat(513*1024)),async url=>response(url.endsWith('/forecast.json') ? forecast : [{...title,issue:{JST:'2026-10-21T03:46:00Z'}},...specs.slice(1)])]){
 const provider=createCycloneTrackProvider({clock:()=>new Date(now),cyclones:{get:async()=>list},fetcher});assert.equal((await provider.get('TC2636')).status,'unavailable');}
});
test('public track endpoint rejects inactive ids and methods, including HEAD without a body',async()=>{
 const worker=createHomeWorker({cyclones:{get:async()=>({schemaVersion:1,status:'empty',data:[]})}}),url='https://shima-craft.com/amami-life-api/cyclones/track?id=TC9999';
 assert.equal((await worker.fetch(new Request(url),{})).status,503);assert.equal(await (await worker.fetch(new Request(url,{method:'HEAD'}),{})).text(),'');assert.equal((await worker.fetch(new Request(url,{method:'POST'}),{})).status,405);
});
