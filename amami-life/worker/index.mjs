import { createCycloneProvider } from "../server/cyclones.mjs";
import { AREAS, validDate, todayJST, addDays, solarForDate, unknownSource } from "../packages/core/src/index.ts";
import { createWeatherProvider } from "../server/weather.mjs";
import { createObservationProvider } from "../server/observations.mjs";
import tides from "./tides.json" with { type: "json" };
import provenance from "../server/data/tide-provenance.json" with { type: "json" };

const security = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};
const csp = "default-src 'self'; img-src 'self' data: https://cyberjapandata.gsi.go.jp; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-src https://www.amami-airport.co.jp https://amami-airport.co.jp; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const sourceErrors={};
export function createHomeWorker({ cyclones = createCycloneProvider(), weather = createWeatherProvider({onError:error=>{sourceErrors.weather=error;}}), observations = createObservationProvider({onError:error=>{sourceErrors.observations=error;}}), clock = () => new Date() } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const own = url.pathname === "/" || url.pathname === "/studio" || url.pathname === "/studio/" || url.pathname.startsWith("/amami-life/") || url.pathname.startsWith("/amami-life-api/");
      if (!own) return env.SHIMA_ORIGIN.fetch(request);
      if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", {status:405,headers:{...security,Allow:"GET, HEAD"}});
      if (url.protocol === "http:" && ["shima-craft.com", "www.shima-craft.com"].includes(url.hostname)) {
        url.protocol="https:";
        return Response.redirect(url.href,308);
      }
      if (url.hostname === "www.shima-craft.com") {
        url.hostname="shima-craft.com";
        return Response.redirect(url.href,308);
      }
      if (url.pathname === "/studio" || url.pathname === "/studio/") {
        const original = new URL(request.url);
        original.hostname="shima-craft.com"; original.protocol="https:"; original.port=""; original.pathname="/";
        original.searchParams.delete("_rsc");
        const headers = new Headers(request.headers);
        for (const name of ["rsc","next-router-state-tree","next-router-prefetch","next-url"]) headers.delete(name);
        const response = await env.SHIMA_ORIGIN.fetch(new Request(original, {method:request.method,headers}));
        if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return response;
        let html = await response.text();
        html = html.replace(/href="\/#/g,'href="/studio#').replace(/(<link[^>]*rel="canonical"[^>]*href=")[^"]+/g,'$1https://shima-craft.com/studio');
        const resultHeaders = new Headers(response.headers);
        for (const name of ["content-length","content-encoding","etag"]) resultHeaders.delete(name);
        resultHeaders.set("Cache-Control","no-store");
        return new Response(request.method==="HEAD" ? null : html,{status:response.status,headers:resultHeaders});
      }
      if (url.pathname.startsWith("/amami-life-api/")) {
        const area = AREAS.find(a=>a.id===(url.searchParams.get("area") ?? "naze"));
        const date = url.searchParams.get("date") ?? todayJST(clock());
        const json = (body,status=200) => new Response(request.method==="HEAD" ? null : JSON.stringify(body),{status,headers:{...security,"Content-Type":"application/json; charset=utf-8"}});
        if (!area || !validDate(date) || (url.searchParams.has("state") && url.searchParams.get("state")!=="ready")) return json({error:"invalid-input"},400);
        const name=url.pathname.slice("/amami-life-api/".length);
        if(name==="cyclones") {const body=await cyclones.get();return json(body,body.status==="unavailable" ? 503 : 200);}
        if(name==="cyclones/chart") {const image=await cyclones.image(url.searchParams.get("version"));return new Response(request.method==="HEAD" ? null : image,{status:image ? 200 : 410,headers:{...security,"Content-Type":image ? "image/png" : "text/plain"}});}
        if (name==="service-health") return json({schemaVersion:1,mode:"public-web",currentHazardsIntegrated:false,cyclonesIntegrated:true,tideYear:2026,...(env.DEBUG_SOURCES==="1" ? {sourceErrors} : {})});
        if (name==="weather") {
          if (url.searchParams.get("mode")!=="live") return json({error:"live-mode-required"},400);
          const body=await weather.get(area.id,date);
          return json(body,body.status==="unavailable" ? 503 : 200);
        }
        if (name==="observations") {
          const body=await observations.get(area.id,date);
          return json(body,body.status==="unavailable" ? 503 : 200);
        }
        if (name==="today") {
          const day=area.station==="O9" ? tides.find(t=>t.date===date) ?? null : null;
          const tomorrow=area.station==="O9" ? tides.find(t=>t.date===addDays(date,1)) ?? null : null;
          const outlook=Array.from({length:7},(_,i)=>{const selected=addDays(date,i);return {date:selected,tide:area.station==="O9" ? tides.find(t=>t.date===selected) ?? null : null,solar:solarForDate(selected,area.lat,area.lon)};});
          return json({schemaVersion:1,mode:"reference",data:{area,date,state:"ready",solar:solarForDate(date,area.lat,area.lon),tide:day,tomorrowTide:tomorrow,outlook,tideSource:provenance,hazards:{state:"unknown",source:unknownSource("official-links","https://www.jma.go.jp/bosai/")}},source:provenance});
        }
        return json({error:"not-found"},404);
      }
      const assetUrl=new URL(request.url);
      assetUrl.search="";
      if (url.pathname==="/") assetUrl.pathname="/amami-life/index.html";
      const response=await env.ASSETS.fetch(new Request(assetUrl,{method:request.method}));
      const headers=new Headers(response.headers);
      for (const [name,value] of Object.entries(security)) headers.set(name,value);
      headers.set("Content-Security-Policy",csp);
      return new Response(response.body,{status:response.status,headers});
    },
  };
}
export default createHomeWorker();
