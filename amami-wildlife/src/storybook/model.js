/** Small pure functions shared by the book controller and behavioural tests. */
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function pageIndex(value){const n=Number(value);return Number.isInteger(n)?clamp(n,0,2):0;}
export function swipePage(dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)<48||Math.abs(dx)<Math.abs(dy)*1.4)return 0;return dx<0?1:-1;}
export function scrollProgress(top,height,viewport,pinTop){const travel=Math.max(1,height-viewport+pinTop);return clamp((pinTop-top)/travel,0,1);}
export function chapterForSpot(spot){return ({hego:'forest',floor:'forest',cape:'forest',falls:'river',stream:'river',estuary:'sea',shore:'sea'})[spot]||null;}
/** Page-turn stage: every position is derived from the real scroll offset, so turns stay interruptible. */
export function slideIndex(value,count){const n=Number(value),last=Math.max(0,count-1);return Number.isInteger(n)?clamp(n,0,last):0;}
export function nearestSlide(scrollLeft,width,count){if(!(width>0)||!Number.isFinite(scrollLeft))return 0;return slideIndex(Math.round(scrollLeft/width),count);}
export function slideOffset(slotLeft,scrollLeft,width){if(!(width>0))return 0;const p=(slotLeft-scrollLeft)/width;return Number.isFinite(p)?clamp(p,-1.8,1.8):0;}
export function bookProgress(index,count){return count>1?clamp(index/(count-1),0,1):1;}
/** Hash aliases keep old /#forest style links and ?spot= deep links pointing at a real page. */
export function chapterFromTarget(search,hash,ids){
 const params=new URLSearchParams(search||''),alias={colophon:'end',explore:'cover',story:'cover'};
 const known=id=>!id?null:ids.includes(id)?id:(alias[id]&&ids.includes(alias[id])?alias[id]:null);
 const spot=params.get('spot');
 return known(params.get('chapter'))||known((hash||'').replace(/^#/,''))||(spot&&spot!=='hego'?known(chapterForSpot(spot)):null)||null;
}
export function chapterUrl(href,id,firstId){const url=new URL(href);id&&id!==firstId?url.searchParams.set('chapter',id):url.searchParams.delete('chapter');url.hash='';return url;}
