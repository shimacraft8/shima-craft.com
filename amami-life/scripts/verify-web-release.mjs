import { writeFile, readFile } from "node:fs/promises";
import { todayJST } from "../packages/core/src/index.ts";
const base=process.argv[2];
if(!["https://shima-craft-amami-life.shimacraft8.workers.dev","https://shima-craft.com"].includes(base)) throw new Error("Unexpected verification target");
const date=todayJST();
const baseline=JSON.parse(await readFile(new URL("../research/shimacraft-publication/before-routes.json",import.meta.url),"utf8"));
const paths=["/","/studio",...baseline.map(r=>r.path).filter(p=>p!=="/"),"/amami-life/privacy.html","/amami-life-api/service-health",`/amami-life-api/today?area=naze&date=${date}`,`/amami-life-api/today?area=koniya&date=${date}`,`/amami-life-api/weather?mode=live&area=naze&date=${date}`,`/amami-life-api/observations?area=naze&date=${date}`,"/amami-life/app.js","/amami-life/core.js","/amami-life/usage.js","/amami-life/style.css","/amami-life/shimacraft.css"];
const rows=await Promise.all(paths.map(async path=>{
  try{
    const response=await fetch(base+path,{headers:{"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"},signal:AbortSignal.timeout(30000)});
    const text=await response.text();
    const row={path,status:response.status,title:text.match(/<title>(.*?)<\/title>/)?.[1],csp:response.headers.get("content-security-policy")};
    if(response.headers.get("content-type")?.includes("json")) row.data=JSON.parse(text);
    const before=baseline.find(r=>r.path===path);
    row.passed=response.ok && (!before || path==="/" || before.title===row.title);
    if(path==="/") row.passed=row.passed && row.title.includes("AMAMI LIFE") && row.csp.includes("frame-ancestors 'none'");
    if(path.startsWith("/amami-life-api/weather")) row.passed=row.passed && !!row.data.data?.description && ["ready","stale","refresh-failed"].includes(row.data.status);
    if(path.startsWith("/amami-life-api/observations")) row.passed=row.passed && typeof row.data.data?.temperatureC==="number";
    if(path.includes("today?area=naze")) row.passed=row.passed && row.data.mode==="reference" && row.data.data.tide?.date===date && row.data.data.hazards.state==="unknown" && !row.data.data.weather && row.data.data.outlook?.length===7;
    if(path.includes("today?area=koniya")) row.passed=row.passed && row.data.data.tide===null;
    return row;
  }catch(error){return {path,passed:false,error:error.name};}
}));
const report={base,checkedAt:new Date().toISOString(),passed:rows.every(r=>r.passed),checks:rows};
const output=new URL(`../research/shimacraft-publication/${base.includes("workers.dev")?"stage":"public"}-http.json`,import.meta.url);
await writeFile(output,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({base,passed:report.passed,checks:rows.map(r=>({path:r.path,status:r.status,passed:r.passed}))},null,2));
if(!report.passed) process.exitCode=1;
