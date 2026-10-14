import { Buffer } from "node:buffer";
import {
  parseJmaForecast,
  forecastForArea,
  JMA_FORECAST_URL,
  JMA_FORECAST_PAGE,
} from "../packages/core/src/weather.ts";
import { unknownSource, freshness } from "../packages/core/src/index.ts";

const REFRESH_MS = 60 * 60_000;
const MAX_AGE_MS = 6 * 60 * 60_000;
const POLICY =
  "取得間隔1時間、失敗再試行1分。発表から6時間で古い表示（アプリの鮮度基準、気象庁の有効期限ではない）。";
export function createWeatherProvider({
  fetcher = fetch,
  clock = () => new Date(),
  timeoutMs = 4000,
  onError = () => {},
} = {}) {
  let cached = null,
    nextAttempt = 0,
    lastAttemptAt = null,
    failed = false,
    pending = null;
  async function refresh() {
    const attempt = clock();
    lastAttemptAt = attempt.toISOString();
    try {
      const response = await fetcher(JMA_FORECAST_URL, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
        redirect: "manual",
      });
      if (!response.ok) throw new Error("upstream-http");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("upstream-empty");
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512 * 1024) {
          await reader.cancel();
          throw new Error("upstream-too-large");
        }
        chunks.push(value);
      }
      const days = parseJmaForecast(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
      if (!days.length) throw new Error("empty-regional-forecast");
      const fetchedAt = clock().toISOString();
      const reports = days.flatMap((d) => d.reportTimes).map(Date.parse);
      if (reports.some((t) => t > Date.parse(fetchedAt) + 60_000))
        throw new Error("future-report");
      // An older response must not replace a newer successful cache.
      if (cached && Math.max(...reports) < cached.latestReport)
        throw new Error("older-report");
      cached = { days, fetchedAt, latestReport: Math.max(...reports) };
      failed = false;
      nextAttempt = clock().getTime() + REFRESH_MS;
    } catch (error) {
      onError({name:error.name,message:error.message});
      failed = true;
      nextAttempt = clock().getTime() + 60_000;
    }
  }
  return {
    async get(areaId, date) {
      if (pending) await pending;
      else if (clock().getTime() >= nextAttempt) {
        pending = refresh();
        try {
          await pending;
        } finally {
          pending = null;
        }
      }
      const data = cached ? forecastForArea(cached.days, areaId, date) : null;
      const issuedAt = data
        ? new Date(Math.min(...data.reportTimes.map(Date.parse))).toISOString()
        : null;
      const source = {
        ...unknownSource("jma-amami-forecast", JMA_FORECAST_PAGE),
        issuedAt,
        fetchedAt: cached?.fetchedAt ?? null,
        checkedAt: lastAttemptAt,
        expiresAt: issuedAt
          ? new Date(Date.parse(issuedAt) + MAX_AGE_MS).toISOString()
          : null,
        freshness: cached ? "recent" : "unavailable",
        upstreamUrl: JMA_FORECAST_URL,
      };
      source.freshness = freshness(source, clock());
      if (failed && source.freshness !== "unavailable")
        source.freshness = "stale";
      return {
        schemaVersion: 1,
        mode: cached ? "live" : "reference",
        data,
        source,
        status: failed
          ? cached
            ? "refresh-failed"
            : "unavailable"
          : !data
            ? "empty"
            : source.freshness === "stale"
              ? "stale"
              : "ready",
        lastAttemptAt,
        refreshPolicy: POLICY,
      };
    },
  };
}
