const PREFIX='/wildlife';
const security={
 'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'strict-origin-when-cross-origin',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'X-Frame-Options':'DENY',
 'Strict-Transport-Security':'max-age=31536000',
};
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...security,Allow:'GET, HEAD','Cache-Control':'no-store'}});
  if(url.pathname===PREFIX)return new Response(null,{status:308,headers:{...security,Location:PREFIX+'/'+url.search,'Cache-Control':'public, max-age=300'}});
  if(!url.pathname.startsWith(PREFIX+'/'))return new Response('Not found',{status:404,headers:security});
  if(/%2f|%5c|%00/i.test(url.pathname))return new Response('Not found',{status:404,headers:security});
  if(!url.pathname.split('/').pop().includes('.')&&!url.pathname.endsWith('/'))return new Response(null,{status:308,headers:{...security,Location:url.pathname+'/'+url.search}});
  const assetUrl=new URL(url);if(assetUrl.pathname.endsWith('/'))assetUrl.pathname+='index.html';assetUrl.search='';
  const res=await env.ASSETS.fetch(new Request(assetUrl,{method:request.method}));
  const headers=new Headers(res.headers);for(const [k,v] of Object.entries(security))headers.set(k,v);
  headers.set('Cache-Control',assetUrl.pathname.includes('/assets/')?'public, max-age=3600, must-revalidate, no-transform':'public, max-age=0, must-revalidate, no-transform');
  headers.set('X-Wildlife-Release','0.2.1');
  if(res.status===404){
   const notFound=new URL(PREFIX+'/404.html',url);const page=await env.ASSETS.fetch(new Request(notFound,{method:request.method}));
   headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store, no-transform');headers.set('X-Robots-Tag','noindex');
   return new Response(page.body,{status:404,headers});
  }
  return new Response(res.body,{status:res.status,headers});
 }
};
