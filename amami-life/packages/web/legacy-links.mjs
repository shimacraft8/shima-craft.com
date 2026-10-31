const paths=/^\/(?:studio|about|services|web-check|privacy|blog|service|industry|amami-dialect|amami-tide|system-samples|nagino-yado-lp|demo03|tools\/photo-colorize)(?:\/|$)/;
export const isReviewPublicPath=path=>paths.test(path);
export const isBusinessPath=path=>/^\/(?:studio|about|services|web-check|service|industry)(?:\/|$)/.test(path);
const sections=new Set(['top','about','service','works','flow','price','faq','contact']);
export function reviewHref(href,path){
 try {
  const url=new URL(href,'https://shima-craft.com'+path);
  if(url.origin!=='https://shima-craft.com' && url.origin!=='https://www.shima-craft.com')return href;
  if(url.pathname==='/' && (!url.hash || sections.has(url.hash.slice(1))))return '/studio'+url.search+url.hash;
  if(href.startsWith('#') && path!=='/studio' && sections.has(url.hash.slice(1)))return '/studio'+url.hash;
  return href;
 }catch{return href;}
}
