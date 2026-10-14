import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseJmaForecast,
  forecastForArea,
  JMA_FORECAST_URL,
} from "../packages/core/src/weather.ts";
import { createWeatherProvider } from "../server/weather.mjs";
import { requestApi } from "../server/index.mjs";
const original = JSON.parse(
  await readFile(
    new URL("./fixtures/jma-forecast-20261013.json", import.meta.url),
    "utf8",
  ),
);
const fixture = () => structuredClone(original);
const response = (value = original) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
function provider(fetcher) {
  let now = new Date("2026-10-13T03:00:00Z");
  return {
    api: createWeatherProvider({ fetcher, clock: () => now }),
    advance: (ms) => (now = new Date(now.getTime() + ms)),
  };
}

test("official captured forecast selects Amami by exact code, aligns weather and six-hour POP series", () => {
  const days = parseJmaForecast(original),
    today = forecastForArea(days, "naze", "2026-10-13");
  assert.equal(today.region.code, "460040");
  assert.match(today.description, /雷/);
  assert.match(today.wind, /南の風/);
  assert.match(today.waves, /２メートル/);
  assert.deepEqual(
    today.precipitation.map((p) => p.percent),
    [20, 40],
  );
  assert.equal(
    new Date(today.precipitation[0].startsAt).toISOString(),
    "2026-10-13T03:00:00.000Z",
  );
  assert.equal(today.temperature, null); // no inferred min/max from the ambiguous paired short series
  assert.equal(
    forecastForArea(days, "naze", "2026-10-14").precipitation.length,
    4,
  );
});
test("weekly min/max is Naze only; blank stays null; zero stays zero; no climatology used", () => {
  const f = fixture(),
    weekly = f[1].timeSeries[0].areas.find((a) => a.area.code === "460040");
  weekly.pops[1] = "0";
  delete weekly.reliabilities; // missing optional confidence does not change daily POP into six-hour POP
  const days = parseJmaForecast(f),
    day = forecastForArea(days, "naze", "2026-10-15");
  assert.equal(day.weeklyPrecipitation, 0);
  assert.deepEqual([day.temperature.minC, day.temperature.maxC], [20, 28]);
  assert.equal(forecastForArea(days, "naze", "2026-10-14").temperature, null);
  for (const area of ["kasari", "koniya"])
    assert.equal(forecastForArea(days, area, "2026-10-15").temperature, null);
  assert.equal(forecastForArea(days, "naze", "2026-11-01"), null);
  assert.throws(() => forecastForArea(days, "naze", "2026-02-30"));
});
test("wrong region, malformed axes, bad POP and reversed temperature fail closed", () => {
  const noAmami = fixture();
  for (const b of noAmami)
    for (const s of b.timeSeries)
      s.areas = s.areas.filter((a) => a.area.code !== "460040");
  assert.throws(() => parseJmaForecast(noAmami), /missing-amami/);
  const badAxis = fixture();
  badAxis[0].timeSeries[0].areas
    .find((a) => a.area.code === "460040")
    .weathers.pop();
  assert.throws(() => parseJmaForecast(badAxis), /axis-mismatch/);
  const badPop = fixture();
  badPop[0].timeSeries[1].areas.find((a) => a.area.code === "460040").pops[0] =
    "101";
  assert.throws(() => parseJmaForecast(badPop), /out-of-range/);
  const badTemp = fixture();
  badTemp[1].timeSeries[1].areas.find(
    (a) => a.area.code === "88837",
  ).tempsMin[1] = "50";
  assert.throws(() => parseJmaForecast(badTemp), /inverted/);
});
test("cache coalesces concurrent requests and never sends selected location/date to JMA", async () => {
  let calls = 0;
  const p = provider(async (url, options) => {
    calls++;
    assert.equal(url, JMA_FORECAST_URL);
    assert.equal(options.redirect, "manual");
    return response();
  });
  const [a, b] = await Promise.all([
    p.api.get("naze", "2026-10-13"),
    p.api.get("koniya", "2026-10-15"),
  ]);
  assert.equal(calls, 1);
  assert.equal(a.status, "ready");
  assert.equal(b.data.temperature, null);
  await p.api.get("naze", "2026-10-14");
  assert.equal(calls, 1);
  p.advance(60 * 60_000);
  await p.api.get("naze", "2026-10-13");
  assert.equal(calls, 2);
});
test("refresh failure preserves last successful fetch, marks cache stale, and backs off for one minute", async () => {
  let calls = 0;
  const p = provider(async () => {
    if (++calls > 1) throw new Error("offline");
    return response();
  });
  const first = await p.api.get("naze", "2026-10-13");
  p.advance(60 * 60_000);
  const failed = await p.api.get("naze", "2026-10-13");
  assert.equal(failed.status, "refresh-failed");
  assert.equal(failed.source.freshness, "stale");
  assert.ok(failed.data);
  assert.equal(failed.source.fetchedAt, first.source.fetchedAt);
  assert.notEqual(failed.lastAttemptAt, first.lastAttemptAt);
  await p.api.get("naze", "2026-10-13");
  assert.equal(calls, 2);
  p.advance(60_000);
  await p.api.get("naze", "2026-10-13");
  assert.equal(calls, 3);
});
test("fresh download of old issuance remains stale; dates outside forecast coverage stay empty", async () => {
  const p = provider(async () => response());
  p.advance(7 * 60 * 60_000);
  const result = await p.api.get("naze", "2026-10-13");
  assert.equal(result.status, "stale");
  assert.equal(result.source.issuedAt, "2026-10-13T02:00:00.000Z");
  assert.equal(result.source.expiresAt, "2026-10-13T08:00:00.000Z");
  const empty = await p.api.get("naze", "2026-11-01");
  assert.equal(empty.status, "empty");
  assert.equal(empty.data, null);
  assert.equal(empty.source.freshness, "unknown");
});
test("initial HTTP failure, schema corruption, oversized response and future issuance never return fabricated data", async () => {
  const future = fixture();
  future[0].reportDatetime = "2026-12-01T11:00:00+09:00";
  for (const fetcher of [
    async () => new Response("bad", { status: 503 }),
    async () => response({}),
    async () => new Response("x".repeat(512 * 1024 + 1)),
    async () => response(future),
  ]) {
    const r = await provider(fetcher).api.get("naze", "2026-10-13");
    assert.equal(r.status, "unavailable");
    assert.equal(r.data, null);
    assert.equal(r.source.fetchedAt, null);
  }
});
test("older upstream revision cannot replace the latest successful cache", async () => {
  let calls = 0;
  const old = fixture();
  for (const b of old) b.reportDatetime = "2026-10-13T10:00:00+09:00";
  const p = provider(async () => response(++calls === 1 ? original : old));
  const a = await p.api.get("naze", "2026-10-13");
  p.advance(60 * 60_000);
  const b = await p.api.get("naze", "2026-10-13");
  assert.equal(b.status, "refresh-failed");
  assert.equal(b.source.issuedAt, a.source.issuedAt);
});
test("live adapter validates before fetching; demo and QA fixtures never trigger upstream fetch", async () => {
  let calls = 0;
  const weather = provider(async () => {
    calls++;
    return response();
  }).api;
  for (const query of [
    "area=wrong&mode=live",
    "date=2026-02-30&mode=live",
    "mode=invalid",
  ])
    assert.equal(
      (await requestApi(new URL("http://local/v1/weather?" + query), weather))
        .code,
      400,
    );
  await requestApi(new URL("http://local/v1/weather"), weather);
  const injected = await requestApi(
    new URL("http://local/v1/weather?mode=live&state=offline"),
    weather,
  );
  assert.equal(injected.body.data, null);
  assert.equal(calls, 0);
  const live = await requestApi(
    new URL("http://local/v1/weather?mode=live&date=2026-10-13"),
    weather,
  );
  assert.equal(live.code, 200);
  assert.equal(live.body.mode, "live");
  assert.equal(calls, 1);
});

test('forecast source rejects a redirect instead of following an unverified destination', async () => {
  let calls=0;
  const f=provider(async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://example.invalid/redirect'}});});
  const result=await f.api.get('naze','2026-10-13');
  assert.equal(calls,1);assert.equal(result.status,'unavailable');assert.equal(result.data,null);
});
