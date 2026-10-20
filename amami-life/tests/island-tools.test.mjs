import test from 'node:test';
import assert from 'node:assert/strict';
import { moonForDate, compassRay, mapPoint, tideAtMinute } from '../packages/core/src/usage.ts';
import { solarForDate, todayJST, LINKS } from '../packages/core/src/index.ts';
const day={date:'2026-10-20',hourly:[{hour:0,heightCm:10},{hour:1,heightCm:30},{hour:23,heightCm:50}],highTides:[],lowTides:[]};
const next={...day,date:'2026-10-21',hourly:[{hour:0,heightCm:90}]};
test('tide inspection respects exact samples, gaps and the following midnight',()=>{
 assert.equal(tideAtMinute(day,next,30).heightCm,20);assert.equal(tideAtMinute(day,next,30).interpolated,true);
 assert.equal(tideAtMinute(day,next,60).heightCm,30);assert.equal(tideAtMinute(day,next,60).interpolated,false);
 assert.equal(tideAtMinute(day,next,90),null);assert.equal(tideAtMinute(day,next,1410).heightCm,70);
 assert.equal(tideAtMinute(day,next,1440).heightCm,90);assert.equal(tideAtMinute(day,{...next,date:'2026-10-22'},1440),null);
 assert.equal(tideAtMinute(null,next,0),null);assert.equal(tideAtMinute(day,next,-1),null);assert.equal(tideAtMinute(day,next,1441),null);
});
test('map rays use true-north clockwise angles and Mercator north/east orientation',()=>{
 for(const [angle,x,y] of [[0,0,-1],[90,1,0],[180,0,1],[270,-1,0]]){const ray=compassRay(angle);assert.ok(Math.abs(ray.x-x)<1e-9);assert.ok(Math.abs(ray.y-y)<1e-9);}
 const a=mapPoint(28,129),n=mapPoint(29,129),e=mapPoint(28,130);assert.ok(n.y<a.y);assert.ok(e.x>a.x);
 const sun=solarForDate('2026-10-20',28.38,129.49);assert.ok(sun.riseAzimuth>90&&sun.riseAzimuth<130);assert.ok(sun.setAzimuth>230&&sun.setAzimuth<270);
});
test('moon events belong to the selected JST day independent of host timezone; no-event days stay empty',()=>{
 const original=process.env.TZ;let missing=false;
 try {
  for(let d=1;d<=31;d++){
   const date=`2026-10-${String(d).padStart(2,'0')}`;process.env.TZ='Pacific/Honolulu';const a=moonForDate(date,28.38,129.49);process.env.TZ='Asia/Tokyo';const b=moonForDate(date,28.38,129.49);assert.deepEqual(a,b);
   for(const event of [a.rise,a.set]) if(event){assert.equal(todayJST(new Date(event.at)),date);assert.ok(event.azimuth>=0&&event.azimuth<360);} else missing=true;
  }
 } finally {if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
 assert.equal(missing,true);assert.throws(()=>moonForDate('2026-02-30',28,129));
});
test('airport opens the user-specified current-flight page',()=>assert.equal(LINKS.find(l=>l.id==='airport').url,'https://www.amami-airport.co.jp/flight/today'));
