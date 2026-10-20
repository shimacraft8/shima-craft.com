const BASE="https://www.jma.go.jp/bosai/";
export const CYCLONE_LIST=BASE+"typhoon/data/targetTc.json";
const CHART_LIST=BASE+"weather_map/data/list.json";
const REFRESH=5*60_000, AGE=6*3600_000;
const chartName=/^\d{14}_0_Z__C_010000_(\d{14})_MET_CHT_JCIspas_JCP600x581_JRcolor_Tjmahp_image\.png$/;
function chartDate(name) {
 const v=chartName.exec(name)?.[1];
 return v ? Date.parse(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(8,10)}:${v.slice(10,12)}:${v.slice(12,14)}Z`) : NaN;
}
export function parseCyclones(value,now) {
 if(!Array.isArray(value) || value.length>20) throw new Error("invalid-list");
 const ids=new Set();
 return value.map(item=>{
  if(!item || !/^TC\d{4}$/.test(item.tropicalCyclone ?? "") || ids.has(item.tropicalCyclone) || !["TY","TS","STS","TD","EX","LOW"].includes(item.category) || !Number.isFinite(Date.parse(item.issue)) || Date.parse(item.issue)>now+60_000 || (item.typhoonNumber!=null && item.typhoonNumber!=="" && !/^\d{4}$/.test(item.typhoonNumber))) throw new Error("invalid-target");
  ids.add(item.tropicalCyclone);
  return {id:item.tropicalCyclone,category:item.category,number:item.typhoonNumber || null,issuedAt:new Date(item.issue).toISOString()};
 });
}
/** Bounded, coalesced read-only retrieval; an unsuccessful empty cache is never 'none'. */
export function createCycloneProvider({fetcher=fetch,clock=()=>new Date(),timeoutMs=5000}={}) {
 let cached=null,pending=null,next=0,failed=false,lastAttemptAt=null,chart=null,chartBytes=null;
 async function bytes(url,limit) {
  const response=await fetcher(url,{redirect:"manual",signal:AbortSignal.timeout(timeoutMs),headers:{Accept:url.endsWith(".png") ? "image/png" : "application/json"}});
  if(!response.ok || !response.body) throw new Error("upstream-http");
  const reader=response.body.getReader(),chunks=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error("too-large");}chunks.push(value);}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
 }
 async function json(url){return JSON.parse(new TextDecoder().decode(await bytes(url,512*1024)));}
 async function refresh(){
  lastAttemptAt=clock().toISOString();
  try{
   const data=parseCyclones(await json(CYCLONE_LIST),clock().getTime());
   // All active entries are replaced, including a confirmed removal/empty response.
   if(cached && data.some(item=>{const old=cached.data.find(old=>old.id===item.id);return old && Date.parse(item.issuedAt)<Date.parse(old.issuedAt);})) throw new Error("older-report");
   cached={data,fetchedAt:clock().toISOString()};failed=false;next=clock().getTime()+REFRESH;
   chart=null;chartBytes=null;
   if(data.length){
    try{
     const list=await json(CHART_LIST), names=list?.near?.now;
     if(!Array.isArray(names)) throw new Error("invalid-chart-list");
     const name=names.filter(n=>typeof n==="string" && chartName.test(n) && Number.isFinite(chartDate(n)) && chartDate(n)<=clock().getTime()+60_000).sort((a,b)=>chartDate(b)-chartDate(a))[0];
     if(name && clock().getTime()-chartDate(name)<AGE) chart={version:name,validAt:new Date(chartDate(name)).toISOString()};
    }catch{/* Image is optional; a failed image must not change a confirmed storm list. */}
   }
  }catch{failed=true;next=clock().getTime()+60_000;}
 }
 async function get(){
  if(pending) await pending;
  else if(clock().getTime()>=next){pending=refresh();try{await pending;}finally{pending=null;}}
  const expired=cached && (clock().getTime()-Date.parse(cached.fetchedAt)>=10*60_000 || cached.data.some(d=>clock().getTime()-Date.parse(d.issuedAt)>=AGE));
  const status=!cached ? "unavailable" : failed ? "refresh-failed" : expired ? "stale" : cached.data.length ? "ready" : "empty";
  return {schemaVersion:1,status,data:cached?.data ?? null,source:{url:CYCLONE_LIST,fetchedAt:cached?.fetchedAt ?? null,checkedAt:lastAttemptAt,expiresAt:cached ? new Date(Math.min(Date.parse(cached.fetchedAt)+10*60_000,...cached.data.map(d=>Date.parse(d.issuedAt)+AGE))).toISOString() : null},chart:status==="ready" && chart && clock().getTime()-Date.parse(chart.validAt)<AGE ? chart : null,coverage:"気象庁の発表対象（全国）。台風と、24時間以内に台風へ発達する見込みの熱帯低気圧。すべての熱帯低気圧や奄美への影響を示すものではありません。",refreshPolicy:"5分キャッシュ、失敗時1分後に再試行。10分未更新または発表から6時間で古い表示。アプリ独自の鮮度基準。"};
 }
 let imagePending=null;
 return {get,async image(version){
  const state=await get();
  if(!state.chart || state.chart.version!==version) return null;
  if(!chartBytes){
   if(!imagePending) imagePending=(async()=>{try{
    const image=await bytes(BASE+"weather_map/data/png/"+version,2*1024*1024);
    const signature=[137,80,78,71,13,10,26,10];
    if(!signature.every((v,i)=>image[i]===v) || image.length<24) throw new Error("invalid-png");
    const data=new DataView(image.buffer,image.byteOffset,image.byteLength);if(data.getUint32(16)!==600 || data.getUint32(20)!==581) throw new Error("invalid-size");
    if(chart?.version===version) chartBytes=image;
   }catch{/* Fail closed; official link remains available. */}})();
   try{await imagePending;}finally{imagePending=null;}
  }
  return chart?.version===version ? chartBytes : null;
 }};
}
