import { writeFile } from 'node:fs/promises';
import { todayJST } from '../../packages/core/src/index.ts';
const base='https://shima-craft.com';
const date=todayJST();
const paths=['/','/?theme=paper','/studio','/services','/amami-dialect','/amami-tide','/system-samples','/web-check','/privacy','/about','/amami-life/privacy.html','/amami-life/apple-refinement.css','/amami-life/app.js','/amami-life/assets/shimacraft-logo-white-red.svg','/amami-life-api/service-health',`/amami-life-api/today?area=naze&date=${date}`,`/amami-life-api/today?area=koniya&date=${date}`,`/amami-life-api/weather?mode=live&area=naze&date=${date}`,`/amami-life-api/observations?area=naze&date=${date}`];
const rows=await Promise.all(paths.map(async path=>{
 try {
  const response=await fetch(base+path,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(30000)});
  const text=await response.text();let passed=response.ok;
  const row={path,status:response.status,title:text.match(/<title>(.*?)<\/title>/s)?.[1],passed,cache:response.headers.get('cache-control')};
  if(path==='/'||path==='/?theme=paper') row.passed=passed&&text.includes('data-theme-mode="ink-only"')&&text.includes('data-theme="ink"')&&!text.includes('data-theme="paper"')&&text.includes('shimacraft-logo-white-red.svg')&&!text.includes('tracker.js');
  if(path==='/studio')row.passed=passed&&['service','works','price','contact'].every(id=>text.includes(`id="${id}"`))&&row.title.includes('ホームページ制作');
  if(path.endsWith('apple-refinement.css'))row.passed=passed&&text.includes('body::before')&&text.includes('.app-shell::after { content: none; }');
  if(path.endsWith('logo-white-red.svg'))row.passed=passed&&text.includes('<clipPath')&&text.includes('data:image/png;base64,');
  if(response.headers.get('content-type')?.includes('json')) {
    row.data=JSON.parse(text);
    if(path.includes('/today?area=naze'))row.passed=passed&&row.data.mode==='reference'&&row.data.data.tide?.date===date&&row.data.data.hazards.state==='unknown'&&row.data.data.outlook?.length===7;
    if(path.includes('/today?area=koniya'))row.passed=passed&&row.data.data.tide===null;
    if(path.includes('/weather?'))row.passed=passed&&!!row.data.data?.description&&['ready','stale','refresh-failed'].includes(row.data.status);
    if(path.includes('/observations?'))row.passed=passed&&typeof row.data.data?.temperatureC==='number';
  }
  return row;
 }catch(error){return {path,passed:false,error:error.name};}
}));
const result={base,checkedAt:new Date().toISOString(),passed:rows.every(r=>r.passed),checks:rows};
await writeFile(new URL('./public-http.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,checks:rows.map(({path,status,passed,title})=>({path,status,passed,title}))},null,2));
if(!result.passed)process.exitCode=1;
