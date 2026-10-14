import test from 'node:test';
import assert from 'node:assert/strict';
import { findOfficialLinks, nextTideEvent, precipitationWindow, createOrderedWriter } from '../packages/core/src/usage.ts';
import { LINKS } from '../packages/core/src/index.ts';
import { parseJmaForecast, forecastForArea } from '../packages/core/src/weather.ts';
import { readFile } from 'node:fs/promises';
const day={date:'2026-10-14',hourly:[],highTides:[{time:'08:37',heightCm:193},{time:'19:50',heightCm:198}],lowTides:[{time:'02:01',heightCm:29},{time:'14:09',heightCm:97}]};
const tomorrow={...day,date:'2026-10-15',highTides:[],lowTides:[{time:'02:33',heightCm:35}]};
test('ordinary travel words and full-width input find published official links',()=>{
  assert.deepEqual(findOfficialLinks('飛行機').map(l=>l.id),['airport']);
  assert.deepEqual(findOfficialLinks('船').map(l=>l.id),['aline','marix']);
  assert.equal(findOfficialLinks('ＡＳＪ')[0].id,'airport');
  assert.equal(findOfficialLinks('飛行機 空港')[0].id,'airport');
  assert.equal(findOfficialLinks('ふぇりー').length,2);
  assert.equal(findOfficialLinks('存在しない店舗').length,0);
});
test('all filter means all local official links, categories intersect search and evacuation follows municipality',()=>{
  assert.equal(findOfficialLinks('').length,LINKS.length-1);
  assert.equal(findOfficialLinks('飛行機','explore').length,0);
  assert.equal(findOfficialLinks('避難所','safety','koniya').some(l=>l.id==='setouchi-hazard'),true);
  assert.equal(findOfficialLinks('避難所','safety','koniya').some(l=>l.id==='shelter'),false);
  assert.equal(findOfficialLinks('','safety','naze').some(l=>l.id==='setouchi-hazard'),false);
});
test('next tide uses remaining times in JST, respects boundary, crosses only a consecutive day',()=>{
  assert.equal(nextTideEvent(day,tomorrow,new Date('2026-10-14T14:08:59+09:00')).time,'14:09');
  assert.equal(nextTideEvent(day,tomorrow,new Date('2026-10-14T14:09:00+09:00')).kind,'干潮');
  assert.equal(nextTideEvent(day,tomorrow,new Date('2026-10-14T14:09:01+09:00')).time,'19:50');
  const next=nextTideEvent(day,tomorrow,new Date('2026-10-14T23:50:00+09:00'));assert.equal(next.date,'2026-10-15');assert.equal(next.time,'02:33');
  assert.equal(nextTideEvent(day,{...tomorrow,date:'2026-10-16'},new Date('2026-10-14T23:50:00+09:00')),null);
});
test('unavailable tide and years do not invent a next event; selected future/past day uses that day',()=>{
  assert.equal(nextTideEvent(null,tomorrow,new Date()),null);
  assert.equal(nextTideEvent(day,null,new Date('2026-10-14T23:50:00+09:00')),null);
  assert.equal(nextTideEvent(tomorrow,null,new Date('2026-10-14T23:50:00+09:00')).time,'02:33');
});
test('rain summary skips completed intervals, preserves zero/null and labels midnight correctly',()=>{
  const weather={date:'2026-10-14',precipitation:[{startsAt:'2026-10-14T06:00:00+09:00',percent:50},{startsAt:'2026-10-14T12:00:00+09:00',percent:0},{startsAt:'2026-10-14T18:00:00+09:00',percent:null}]};
  assert.deepEqual(precipitationWindow(weather,new Date('2026-10-14T12:00:00+09:00')).percent,0);
  assert.equal(precipitationWindow(weather,new Date('2026-10-14T18:00:00+09:00')).label,'18–翌0時');
  assert.equal(precipitationWindow(weather,new Date('2026-10-14T18:00:00+09:00')).percent,null);
  assert.equal(precipitationWindow(null,new Date()),null);
});
test('old unused weekly issuance does not age fresh short forecast, but displayed Naze weekly temperature still does',async()=>{
  const fixture=JSON.parse(await readFile(new URL('./fixtures/jma-forecast-20261013.json',import.meta.url),'utf8'));
  fixture[0].reportDatetime='2026-10-13T11:00:00+09:00'; fixture[1].reportDatetime='2026-10-12T17:00:00+09:00';
  const days=parseJmaForecast(fixture);
  assert.deepEqual(forecastForArea(days,'naze','2026-10-13').reportTimes,['2026-10-13T02:00:00.000Z']);
  assert.equal(forecastForArea(days,'naze','2026-10-15').reportTimes.includes('2026-10-12T08:00:00.000Z'),true);
  assert.equal(forecastForArea(days,'kasari','2026-10-14').temperature,null);
});
test('memo writes cannot finish out of order, and a failed write does not block the latest value',async()=>{
  const calls=[], finished=[];let release;
  const write=createOrderedWriter(async(_key,value)=>{calls.push(value);if(value==='first') await new Promise(r=>{release=r;});if(value==='bad')throw Error('disk');finished.push(value);});
  const first=write('memo','first'),last=write('memo','last');await new Promise(r=>setImmediate(r));assert.deepEqual(calls,['first']);release();await Promise.all([first,last]);assert.deepEqual(finished,['first','last']);
  const bad=write('memo','bad'),retry=write('memo','retry');await assert.rejects(bad);await retry;assert.equal(finished.at(-1),'retry');
});
