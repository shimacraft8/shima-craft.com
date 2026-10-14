import { Buffer } from "node:buffer";
import { JMA_AMEDAS_PAGE, JMA_AMEDAS_LATEST, observationTime, observationMapUrl, parseObservations } from "../packages/core/src/observations.ts";
import { todayJST, validDate, unknownSource } from "../packages/core/src/index.ts";

export function createObservationProvider({ fetcher = fetch, clock = () => new Date(), timeoutMs = 4000, onError = () => {} } = {}) {
  let cached = null, nextAttempt = 0, checkedAt = null, failed = false, pending = null;
  async function read(url, limit, signal) {
    const res = await fetcher(url, { signal, redirect: "manual", headers: { Accept: "application/json, text/plain" } });
    if (!res.ok || !res.body) throw new Error("observation-upstream");
    const reader = res.body.getReader(), chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error("observation-too-large"); }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  async function refresh() {
    checkedAt = clock().toISOString();
    try {
      const signal = AbortSignal.timeout(timeoutMs);
      const time = observationTime(await read(JMA_AMEDAS_LATEST, 128, signal));
      if (Date.parse(time) > clock().getTime() + 60_000 || (cached && Date.parse(time) < cached.time)) throw new Error("invalid-time-order");
      const upstreamUrl = observationMapUrl(time);
      const observations = parseObservations(JSON.parse(await read(upstreamUrl, 2 * 1024 * 1024, signal)), time);
      cached = { observations, time: Date.parse(time), upstreamUrl, fetchedAt: clock().toISOString() };
      failed = false;
      nextAttempt = clock().getTime() + 10 * 60_000;
    } catch (error) {
      onError({name:error.name,message:error.message});
      failed = true;
      nextAttempt = clock().getTime() + 60_000;
    }
  }
  return {
    async get(area, date = todayJST(clock())) {
      if (!['naze', 'kasari', 'koniya'].includes(area) || !validDate(date)) throw new Error("invalid-observation-input");
      const selectedToday = date === todayJST(clock());
      if (selectedToday) {
        if (pending) await pending;
        else if (clock().getTime() >= nextAttempt) {
          pending = refresh();
          try { await pending; } finally { pending = null; }
        }
      }
      // Current readings are never shown under a past or future calendar day.
      const data = selectedToday ? cached?.observations[area] ?? null : null;
      const expiresAt = data ? new Date(Date.parse(data.observedAt) + 20 * 60_000).toISOString() : null;
      const stale = !!data && (failed || clock().getTime() >= Date.parse(expiresAt));
      return {
        schemaVersion: 1, mode: data ? "live" : "reference", data,
        status: !selectedToday ? "empty" : failed ? cached ? "refresh-failed" : "unavailable" : !data || data.temperatureC === null ? "empty" : stale ? "stale" : "ready",
        source: { ...unknownSource("jma-amedas", JMA_AMEDAS_PAGE), issuedAt: null, observedAt: data?.observedAt ?? null,
          fetchedAt: data ? cached.fetchedAt : null, checkedAt, expiresAt,
          freshness: !data ? "unavailable" : stale ? "stale" : "recent", upstreamUrl: data ? cached.upstreamUrl : null },
        refreshPolicy: "取得間隔10分、失敗時1分。観測から20分を鮮度目安とするアプリ基準。品質0のみ表示。過去・未来の実況は未提供。",
      };
    },
  };
}
