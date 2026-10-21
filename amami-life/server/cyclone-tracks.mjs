const ROOT="https://www.jma.go.jp/bosai/typhoon/data/";
const FRESH=10*60_000, ISSUE_AGE=6*3600_000;
const iso=value=>{const time=Date.parse(value);if(!Number.isFinite(time))throw new Error("invalid-time");return new Date(time).toISOString();};
const coord=value=>Array.isArray(value) && value.length===2 && value.every(Number.isFinite) && Math.abs(value[0])<=80 && value[1]>=80 && value[1]<=200;
const optionalNumber=(value,min,max)=>value==null || value==="" || value==="-" ? null : /^\d+(?:\.\d+)?$/.test(String(value)) && Number(value)>=min && Number(value)<=max ? Number(value) : null;
const text=value=>typeof value==="string" && value.length<=80 && !/[<>]/.test(value) && [...value].every(c=>c.charCodeAt(0)>=32) ? value : null;
/** Only official forecast centers/circles; no invented interpolation or impact estimates. */
export function parseCycloneTrack(forecast,specifications,target,now) {
 if(!Array.isArray(forecast) || !Array.isArray(specifications) || forecast.length<2 || forecast.length>30 || specifications.length<2 || specifications.length>30 || forecast[0]?.part!=="title" || specifications[0]?.part!=="title")throw new Error("invalid-track");
 const title=forecast[0],specTitle=specifications[0],issuedAt=iso(title.issue?.JST);
 if(issuedAt!==iso(specTitle.issue?.JST) || issuedAt!==target.issuedAt || Date.parse(issuedAt)>now+60_000 || (title.typhoonNumber || null)!==target.number || (specTitle.typhoonNumber || null)!==target.number)throw new Error("mixed-issue");
 let last=-1,analysisTime=null;
 const points=forecast.slice(1).map(item=>{
  const hours=item.advancedHours,center=item.center;
  if(!Number.isInteger(hours) || hours<0 || hours>126 || hours<=last || !coord(center))throw new Error("invalid-point");
  last=hours;
  const validAt=iso(item.validtime?.JST),time=Date.parse(validAt);
  if(hours===0){if(time>Date.parse(issuedAt)+60_000 || Date.parse(issuedAt)-time>6*3600_000)throw new Error("invalid-analysis");analysisTime=time;}
  if(analysisTime===null || Math.abs(time-analysisTime-hours*3600_000)>60_000)throw new Error("invalid-horizon");
  const spec=specifications.find(s=>s.advancedHours===hours);
  if(!spec || iso(spec.validtime?.JST)!==validAt || !coord(spec.position?.deg) || spec.position.deg.some((v,i)=>v!==center[i]))throw new Error("mixed-point");
  const radius=hours===0 ? null : item.probabilityCircle?.radius;
  if(hours>0 && (!Number.isFinite(radius) || radius<=0 || radius>1_500_000))throw new Error("invalid-circle");
  return {hours,validAt,lat:center[0],lon:center[1],radiusM:radius,radiusKm:hours ? optionalNumber(spec.probabilityCircleRadius?.km,1,2000) : null,pressureHpa:optionalNumber(spec.pressure,800,1100),windMs:optionalNumber(spec.maximumWind?.sustained?.["m/s"],0,150),gustMs:optionalNumber(spec.maximumWind?.gust?.["m/s"],0,200),category:text(spec.category?.jp),intensity:text(spec.intensity),location:text(spec.location)};
 });
 if(points[0].hours!==0)throw new Error("missing-analysis");
 return {id:target.id,number:target.number,category:target.category,name:text(title.name?.jp),issuedAt,points};
}
/** Per-isolate bounded cache, shared in-flight requests, fixed upstream URLs. */
export function createCycloneTrackProvider({cyclones,fetcher=fetch,clock=()=>new Date(),timeoutMs=5000}={}) {
 const cache=new Map();
 async function json(url){
  const response=await fetcher(url,{redirect:"manual",signal:AbortSignal.timeout(timeoutMs),headers:{Accept:"application/json"}});
  if(!response.ok || !response.body)throw new Error("upstream");
  const reader=response.body.getReader(),chunks=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>512*1024){await reader.cancel();throw new Error("too-large");}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
 }
 return {async get(id){
  const unavailable={schemaVersion:1,status:"unavailable",data:null,source:{fetchedAt:null,issuedAt:null,expiresAt:null}};
  if(!/^TC\d{4}$/.test(id ?? ""))return unavailable;
  const list=await cyclones.get(),target=list.data?.find(t=>t.id===id);
  for(const key of cache.keys())if(!list.data?.some(t=>t.id===key))cache.delete(key);
  if(!target || list.status==="unavailable" || list.status==="empty")return unavailable;
  let entry=cache.get(id);if(!entry){entry={next:0,pending:null,cached:null,failed:false};cache.set(id,entry);}
  const now=clock().getTime();
  if(!entry.pending && (now>=entry.next || (entry.cached?.data.issuedAt!==target.issuedAt && entry.attemptIssue!==target.issuedAt))){
   entry.attemptIssue=target.issuedAt;
   entry.pending=(async()=>{try{
    const [forecast,specs]=await Promise.all([json(ROOT+id+"/forecast.json"),json(ROOT+id+"/specifications.json")]);
    const data=parseCycloneTrack(forecast,specs,target,clock().getTime());
    entry.cached={data,fetchedAt:clock().toISOString()};entry.failed=false;entry.next=clock().getTime()+5*60_000;
   }catch{entry.failed=true;entry.next=clock().getTime()+60_000;}})();
  }
  if(entry.pending){try{await entry.pending;}finally{entry.pending=null;}}
  if(!entry.cached)return unavailable;
  const {data,fetchedAt}=entry.cached,expiresAt=new Date(Math.min(Date.parse(fetchedAt)+FRESH,Date.parse(data.issuedAt)+ISSUE_AGE)).toISOString();
  const stale=list.status!=="ready" || data.issuedAt!==target.issuedAt || clock().getTime()>=Date.parse(expiresAt);
  return {schemaVersion:1,status:entry.failed ? "refresh-failed" : stale ? "stale" : "ready",data,source:{urls:[ROOT+id+"/forecast.json",ROOT+id+"/specifications.json"],fetchedAt,issuedAt:data.issuedAt,expiresAt}};
 }};
}
