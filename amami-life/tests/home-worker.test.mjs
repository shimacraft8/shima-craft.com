import test from "node:test";
import assert from "node:assert/strict";
import { createHomeWorker } from "../worker/index.mjs";
const clock=()=>new Date("2026-10-14T14:30:00+09:00");
const weather={get:async()=>({schemaVersion:1,status:"unavailable",data:null})};
const observations={get:async()=>({schemaVersion:1,status:"empty",data:null})};
const worker=createHomeWorker({clock,weather,observations});
const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname,{headers:{"content-type":"text/html"}})},SHIMA_ORIGIN:{fetch:async request=>new Response(request.method+" "+new URL(request.url).pathname)}};
const get=(path)=>worker.fetch(new Request("https://shima-craft.com"+path),env);
test("public homepage uses namespaced assets; existing routes and POST bodies pass to original service",async()=>{
  assert.equal(await (await get("/")).text(),"/amami-life/index.html");
  assert.equal(await (await get("/services")).text(),"GET /services");
  const response=await worker.fetch(new Request("https://shima-craft.com/api/contact",{method:"POST",body:"keep-me",headers:{Cookie:"session=keep"}}),{...env,SHIMA_ORIGIN:{fetch:async request=>{assert.equal(request.headers.get("Cookie"),"session=keep");return new Response(await request.text());}}});
  assert.equal(await response.text(),"keep-me");
  assert.equal((await get("/")).headers.get("Content-Security-Policy").includes("frame-ancestors 'none'"),true);
});
test("public API has reference tide/solar and unknown hazards, never demo weather",async()=>{
  const body=await (await get("/amami-life-api/today?area=naze&date=2026-10-14")).json();
  assert.equal(body.mode,"reference");assert.equal(body.data.weather,undefined);
  assert.equal(body.data.tide.date,"2026-10-14");assert.equal(body.data.tomorrowTide.date,"2026-10-15");
  assert.equal(body.data.hazards.state,"unknown");
  const other=await (await get("/amami-life-api/today?area=koniya&date=2026-10-14")).json();
  assert.equal(other.data.tide,null);assert.equal(other.data.tomorrowTide,null);
  const nextYear=await (await get("/amami-life-api/today?date=2027-01-01")).json();assert.equal(nextYear.data.tide,null);
});
test("public API rejects QA states, invalid area/date, and non-live weather",async()=>{
  for(const suffix of ["today?state=error","today?area=unknown","today?date=2026-02-30","weather?mode=demo"]) assert.equal((await get("/amami-life-api/"+suffix)).status,400);
  assert.equal((await get("/amami-life-api/weather?mode=live")).status,503);
  assert.equal((await get("/amami-life-api/observations")).status,200);
  assert.equal((await get("/amami-life-api/not-found")).status,404);
});
test("production aliases redirect safely and HEAD has no JSON body",async()=>{
  const redirect=await worker.fetch(new Request("https://www.shima-craft.com/?area=kasari"),env);assert.equal(redirect.status,308);assert.equal(redirect.headers.get("Location"),"https://shima-craft.com/?area=kasari");
  const head=await worker.fetch(new Request("https://shima-craft.com/amami-life-api/today",{method:"HEAD"}),env);assert.equal(await head.text(),"");
  assert.equal((await worker.fetch(new Request("https://shima-craft.com/amami-life-api/today",{method:"POST"}),env)).status,405);
});
test("studio keeps original business HTML while separating canonical URL and root anchors",async()=>{
  const result=await worker.fetch(new Request("https://shima-craft.com/studio?_rsc=test",{headers:{RSC:"1"}}),{...env,SHIMA_ORIGIN:{fetch:async request=>{
    assert.equal(new URL(request.url).pathname,"/");assert.equal(new URL(request.url).search,"");assert.equal(request.headers.has("RSC"),false);
    return new Response('<link rel="canonical" href="https://shima-craft.com/"><a href="/#service">service</a>',{headers:{"content-type":"text/html","etag":"old"}});
  }}});
  assert.equal(result.headers.has("etag"),false);
  assert.equal(await result.text(),'<link rel="canonical" href="https://shima-craft.com/studio"><a href="/studio#service">service</a>');
});
