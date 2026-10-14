import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createObservationProvider } from "../server/observations.mjs";
import { observationTime, observationMapUrl, parseObservations, OBSERVATION_STATIONS, JMA_AMEDAS_LATEST } from "../packages/core/src/observations.ts";
import { requestApi } from "../server/index.mjs";
const sample = JSON.parse(await readFile(new URL('./fixtures/jma-amedas-20261014.json', import.meta.url), 'utf8'));
const time = '2026-10-14T08:10:00+09:00';
const response = () => new Response(JSON.stringify(sample));
function fixture(fetcher) {
  let now = new Date('2026-10-13T23:15:00Z');
  return { provider: createObservationProvider({ fetcher, clock: () => now }), advance(ms) { now = new Date(now.getTime() + ms); } };
}
test('official three-station sample uses current Naze station, distinct coordinates and decimal temperatures', () => {
  const parsed = parseObservations(sample, time);
  assert.equal(parsed.naze.station.code, '88837');
  assert.equal(parsed.naze.temperatureC, 25.7);
  assert.equal(parsed.kasari.temperatureC, 24.8);
  assert.equal(parsed.koniya.temperatureC, 26.1);
  assert.equal(parsed.naze.observedAt, '2026-10-13T23:10:00.000Z');
  assert.equal(OBSERVATION_STATIONS.koniya.lat, 28 + 8.6 / 60);
  assert.equal(observationMapUrl(time), 'https://www.jma.go.jp/bosai/amedas/data/map/20261014081000.json');
});
test('quality, zero, missing stations and invalid values are not coerced to normal temperatures', () => {
  for (const bad of [[12, 1], [12, 4], [12, 5], [12, 6], [12, 7], [12, null], [12, '0'], ['12', 0], [null, 0], [NaN, 0], [61, 0], [12, 0, 0]]) {
    assert.equal(parseObservations({ '88837': { temp: bad } }, time).naze.temperatureC, null);
  }
  assert.equal(parseObservations({ '88837': { temp: [0, 0] } }, time).naze.temperatureC, 0);
  assert.equal(parseObservations({}, time).koniya.temperatureC, null);
  assert.throws(() => parseObservations([], time));
});
test('invalid time cannot construct alternate upstream URLs', () => {
  for (const bad of ['2026-02-30T08:10:00+09:00', '2026-10-14T25:10:00+09:00', '2026-10-14T08:11:00+09:00', '../point.json', '2026-10-14T08:10:00Z']) assert.throws(() => observationTime(bad));
});
test('coalesces requests, uses fixed national URLs and skips past/future dates', async () => {
  let calls = 0;
  const f = fixture(async (url, options) => { calls++; assert.equal(options.redirect, 'manual'); return url === JMA_AMEDAS_LATEST ? new Response(time) : response(); });
  const [a,b] = await Promise.all([f.provider.get('naze','2026-10-14'),f.provider.get('kasari','2026-10-14')]);
  assert.equal(calls,2);assert.equal(a.status,'ready');assert.equal(b.data.station.code,'88821');
  for (const date of ['2026-10-13','2026-10-15']) { const r=await f.provider.get('naze',date);assert.equal(r.status,'empty');assert.equal(r.data,null); }
  assert.equal(calls,2);
});
test('old upstream observations stay stale even after a successful fresh download', async () => {
  const f=fixture(async url=>url===JMA_AMEDAS_LATEST?new Response(time):response());f.advance(20*60_000);
  const r=await f.provider.get('naze','2026-10-14');assert.equal(r.status,'stale');assert.notEqual(r.source.fetchedAt,r.data.observedAt);assert.equal(r.source.issuedAt,null);
});
test('refresh failure preserves successful timestamps, marks cached value old, and backs off', async () => {
  let calls=0, fail=false;
  const f=fixture(async url=>{calls++;if(fail)throw Error('offline');return url===JMA_AMEDAS_LATEST?new Response(time):response();});
  const a=await f.provider.get('naze','2026-10-14');fail=true;f.advance(10*60_000);
  const b=await f.provider.get('naze','2026-10-14');assert.equal(b.status,'refresh-failed');assert.equal(b.source.fetchedAt,a.source.fetchedAt);assert.equal(b.data.temperatureC,25.7);
  await f.provider.get('naze','2026-10-14');assert.equal(calls,3);f.advance(60_000);await f.provider.get('naze','2026-10-14');assert.equal(calls,4);
});
test('failure, corrupt/oversized map and future observations fail closed', async () => {
  for (const map of [new Response('bad',{status:503}),new Response('[]'),new Response('x'.repeat(2*1024*1024+1))]) {
    const f=fixture(async url=>url===JMA_AMEDAS_LATEST?new Response(time):map);
    const r=await f.provider.get('naze','2026-10-14');assert.equal(r.status,'unavailable');assert.equal(r.data,null);
  }
  const f=fixture(async()=>new Response('2026-10-14T09:10:00+09:00'));assert.equal((await f.provider.get('naze','2026-10-14')).status,'unavailable');
});
test('older map does not replace newer cache; missing quality0 temperature stays empty', async () => {
  let old=false;const f=fixture(async url=>url===JMA_AMEDAS_LATEST?new Response(old?'2026-10-14T08:00:00+09:00':time):response());
  const a=await f.provider.get('naze','2026-10-14');old=true;f.advance(10*60_000);const b=await f.provider.get('naze','2026-10-14');assert.equal(b.status,'refresh-failed');assert.equal(b.data.observedAt,a.data.observedAt);
  const missing=fixture(async url=>url===JMA_AMEDAS_LATEST?new Response(time):new Response('{}'));assert.equal((await missing.provider.get('naze','2026-10-14')).status,'empty');
});
test('API rejects malformed input before invoking observation provider', async () => {
  let calls=0;const provider={get:async()=>{calls++;return{status:'ready'};}};
  assert.equal((await requestApi(new URL('http://local/v1/observations?area=wrong'),null,provider)).code,400);
  assert.equal((await requestApi(new URL('http://local/v1/observations?state=offline'),null,provider)).body.data,null);
  assert.equal(calls,0);assert.equal((await requestApi(new URL('http://local/v1/observations?area=naze'),null,provider)).code,200);assert.equal(calls,1);
});

test('observation source rejects a redirect before requesting a station map', async () => {
  let calls=0;
  const f=fixture(async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://example.invalid/redirect'}});});
  const result=await f.provider.get('naze','2026-10-14');
  assert.equal(calls,1);assert.equal(result.status,'unavailable');assert.equal(result.data,null);
});
