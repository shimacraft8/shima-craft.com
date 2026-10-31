/** Presentation-only compatibility layer. Never handles API/auth/POST bodies. */
import { isReviewPublicPath, isBusinessPath, reviewHref } from '../packages/web/legacy-links.mjs';
export { isReviewPublicPath, isBusinessPath, reviewHref };
export function rewriteLegacyHtml(html,path){
 const business=isBusinessPath(path);
 if(path.startsWith('/nagino-yado-lp'))html=html.replace(/(<title>[^<]*)｜SHIMA CRAFT｜SHIMA CRAFT(<\/title>)/,'$1｜SHIMA CRAFT$2');
 if(path==='/demo03')html=html.replace(/<title>[^<]*<\/title>/,'<title>宿泊予約管理の画面サンプル｜SHIMA CRAFT</title>');
 const token=/<(script|style|textarea)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->|<(?:[^"'<>]|"[^"]*"|'[^']*')+>/gi;
 // Operate on tags, never strings inside Next's serialized script payload.
 html=html.replace(token,tag=>{
  if(/^<!--/.test(tag))return tag;
  if(/^<(?:script|style|textarea)\b/i.test(tag)){
   if(business && /^<script\b/i.test(tag) && /\bsrc=["']https:\/\/(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net)\//i.test(tag))return '';
   return tag;
  }
  if(business && /^<link\b/i.test(tag) && /(?:googlesyndication|doubleclick)/.test(tag))return '';
  if(/^<a\b/i.test(tag))return tag.replace(/\bhref=(["'])(.*?)\1/i,(_,q,href)=>'href='+q+reviewHref(href,path)+q);
  return tag;
 });
 if(!html.includes('data-shima-review')){
  html=html.replace(/<\/head\s*>/i,'<link rel="stylesheet" href="/amami-life/legacy-bridge.css" data-shima-review><script type="module" src="/amami-life/legacy-bridge.js"></script></head>');
 }
 return html;
}
export async function reviewOriginResponse(response,request){
 const path=new URL(request.url).pathname;
 if(path==='/sitemap.xml' && request.method==='GET' && response.ok){const xml=(await response.text()).replace(/<url>\s*<loc>https:\/\/(?:www\.)?shima-craft\.com\/amami-road-quest\/?<\/loc>[\s\S]*?<\/url>/g,'');const headers=new Headers(response.headers);for(const key of ['etag','content-length','content-encoding'])headers.delete(key);return new Response(xml,{status:response.status,headers});}
 if(!isReviewPublicPath(path) || request.method!=='GET' || !response.ok || !response.headers.get('content-type')?.includes('text/html'))return response;
 const html=rewriteLegacyHtml(await response.text(),path),headers=new Headers(response.headers);
 for(const key of ['etag','content-length','content-encoding'])headers.delete(key);
 headers.set('Cache-Control','no-store');
 // Legacy pages use self-hosted bundles and the existing Google measurement tag.
 // Restrict scripts on business pages so the old layout cannot reinsert AdSense.
 if(isBusinessPath(path) && !headers.has('Content-Security-Policy'))headers.set('Content-Security-Policy',"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://static.cloudflareinsights.com https://challenges.cloudflare.com");
 return new Response(html,{status:response.status,headers});
}
