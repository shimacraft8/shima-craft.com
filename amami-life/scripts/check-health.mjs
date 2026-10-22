/** Bounded, read-only public health check. No mail, credentials or deployment. */
import { pathToFileURL } from 'node:url';
export async function checkHealth({ fetcher=fetch, clock=()=>new Date() }={}) {
 const base='https://shima-craft.com';const rows=[];
 const paths=['/','/amami-life-api/service-health','/amami-life-api/observations?area=naze','/amami-life-api/cyclones'];
 for(const path of paths) {
  try {
   const res=await fetcher(base+path,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:path==='/'?'text/html':'application/json','User-Agent':'SHIMA-CRAFT-health/1.0'}});
   if(!res.ok || !res.body) throw Error('http-'+res.status);
   const reader=res.body.getReader(),chunks=[];let bytes=0;
   try {for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>131072){await reader.cancel();throw Error('body-limit');}chunks.push(value);}}finally{reader.releaseLock();}
   const text=Buffer.concat(chunks).toString('utf8');let state='ok';let code='OK';
   if(path==='/') {if(!text.includes('AMAMI LIFE') || !text.includes('data-release="public"')) throw Error('html-identity');}
   else {
    const body=JSON.parse(text);if(body.schemaVersion!==1) throw Error('schema');
    if(path.includes('service-health')) {if(body.mode!=='public-web')throw Error('mode');}
    else {
     if(!['ready','empty'].includes(body.status))throw Error('data-unavailable-or-stale');
     const expiry=Date.parse(body.source?.expiresAt??'');const fetched=Date.parse(body.source?.fetchedAt??'');
     if(!Number.isFinite(fetched)||fetched>clock().getTime()+60000||clock().getTime()-fetched>30*60000) throw Error('fetch-age');
     if(Number.isFinite(expiry)&&expiry<=clock().getTime())throw Error('expired');
     if(path.includes('observations') && (body.status!=='ready'||typeof body.data?.temperatureC!=='number')) throw Error('observation-missing');
     if(path.includes('cyclones')&&body.status==='empty'&&body.data?.length!==0)throw Error('cyclone-empty-schema');
     if(body.status==='empty'){state='ok';code='VERIFIED_EMPTY';}
    }
   }
   rows.push({path,state,code});
  } catch(error) {rows.push({path,state:'failed',code:typeof error.message==='string' && /^[a-zA-Z0-9_-]{1,50}$/.test(error.message)?error.message:'REQUEST_FAILED'});}
 }
 return {checkedAt:clock().toISOString(),site:base,passed:rows.every(row=>row.state==='ok'),checks:rows,scope:'Public availability and data freshness only; not proof that login, mail, all hazards, backup or notifications work.'};
}
if(process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url) {const result=await checkHealth();console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;}
