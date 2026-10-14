import test from 'node:test';
import assert from 'node:assert/strict';
import { tideOverview } from '../packages/core/src/usage.ts';
import { createHomeWorker } from '../worker/index.mjs';
const day={date:'2026-10-14',hourly:Array.from({length:24},(_,hour)=>({hour,heightCm:hour*10})),highTides:[{time:'08:37',heightCm:193},{time:'19:50',heightCm:198}],lowTides:[{time:'02:01',heightCm:29},{time:'14:09',heightCm:97}]};
const next={date:'2026-10-15',hourly:[{hour:0,heightCm:240}],highTides:[],lowTides:[{time:'02:33',heightCm:35}]};
test('separate next high/low skip elapsed events and mark the following date in JST',()=>{
 const s=tideOverview(day,next,new Date('2026-10-14T09:30:00Z'));
 assert.equal(s.minute,1110);assert.equal(s.heightCm,185);assert.equal(s.trend,'満ちる傾向');
 assert.equal(s.high.time,'19:50');assert.equal(s.low.time,'02:33');assert.equal(s.low.date,'2026-10-15');
});
test('hourly chart breaks at missing samples, does not invent a value or midnight endpoint',()=>{
 const sparse={...day,hourly:day.hourly.filter(p=>p.hour!==10)};
 const s=tideOverview(sparse,null,new Date('2026-10-14T09:30:00+09:00'));
 assert.equal(s.heightCm,null);assert.equal(s.trend,null);assert.equal(s.segments.length,2);
 assert.equal(s.segments.at(-1).at(-1).minute,1380);
 assert.equal(tideOverview(day,{...next,date:'2026-10-16'},new Date('2026-10-14T23:30:00+09:00')).heightCm,null);
});
test('selected past/future dates never show a current estimate; midnight uses consecutive next day only',()=>{
 const s=tideOverview(day,next,new Date('2026-10-14T23:30:00+09:00'));assert.equal(s.heightCm,235);assert.equal(s.segments[0].at(-1).minute,1440);
 assert.equal(tideOverview(day,next,new Date('2026-10-13T12:00:00+09:00')).heightCm,null);
 assert.equal(tideOverview(null,next,new Date()).high,null);
});
test('seven-day reference outlook stays within station and year and contains no fabricated forecast',async()=>{
 const worker=createHomeWorker();const env={};
 const get=async q=>(await worker.fetch(new Request('https://shima-craft.com/amami-life-api/today?'+q),env)).json();
 const a=await get('area=naze&date=2026-12-30');assert.equal(a.data.outlook.length,7);assert.equal(a.data.outlook[1].tide.date,'2026-12-31');assert.equal(a.data.outlook[2].tide,null);assert.equal(a.data.outlook[2].weather,undefined);
 const b=await get('area=koniya&date=2026-10-14');assert.ok(b.data.outlook.every(d=>d.tide===null));assert.ok(b.data.outlook.every(d=>d.solar.sunset));
});
