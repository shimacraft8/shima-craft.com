import { validDate, type AreaId, type Envelope } from "./index.ts";

// Verified against the official station table on 2026-10-14. These are
// observation sites, distinct from the representative solar/tide points.
export const OBSERVATION_STATIONS = {
  naze: { code: "88837", name: "名瀬", lat: 28 + 23.1 / 60, lon: 129 + 29.6 / 60 },
  kasari: { code: "88821", name: "笠利（奄美空港）", lat: 28 + 25.8 / 60, lon: 129 + 42.7 / 60 },
  koniya: { code: "88901", name: "古仁屋", lat: 28 + 8.6 / 60, lon: 129 + 18.9 / 60 },
} as const;
export const JMA_AMEDAS_PAGE = "https://www.jma.go.jp/bosai/amedas/";
export const JMA_AMEDAS_LATEST = JMA_AMEDAS_PAGE + "data/latest_time.txt";
export type Observation = {
  station: (typeof OBSERVATION_STATIONS)[AreaId];
  observedAt: string;
  temperatureC: number | null;
  qualityCode: number | null;
};
export type ObservationEnvelope = Envelope<Observation> & {
  status: "ready" | "empty" | "stale" | "unavailable" | "refresh-failed";
  refreshPolicy: string;
};
export function observationTime(text: string): string {
  const s = text.trim();
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:00\+09:00$/.test(s) ||
      !validDate(s.slice(0, 10)) || Number(s.slice(14, 16)) % 10 !== 0)
    throw new Error("invalid-observation-time");
  return s;
}
export function observationMapUrl(time: string): string {
  return JMA_AMEDAS_PAGE + "data/map/" + observationTime(time).slice(0, 19).replace(/[-:T]/g, "") + ".json";
}
export function parseObservations(value: unknown, time: string): Record<AreaId, Observation> {
  const observedAt = new Date(observationTime(time)).toISOString();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid-observation-map");
  return Object.fromEntries(Object.entries(OBSERVATION_STATIONS).map(([area, station]) => {
    const entry = (value as Record<string, unknown>)[station.code];
    const tuple = entry && typeof entry === "object" ? (entry as Record<string, unknown>).temp : null;
    const qualityCode = Array.isArray(tuple) && tuple.length === 2 && Number.isInteger(tuple[1]) ? tuple[1] as number : null;
    // Conservative initial scope: only unmarked quality 0. Do not silently
    // present quasi-normal, doubtful, suspended or missing values as normal.
    const temperatureC = Array.isArray(tuple) && qualityCode === 0 &&
      typeof tuple[0] === "number" && Number.isFinite(tuple[0]) && tuple[0] >= -90 && tuple[0] <= 60 ? tuple[0] : null;
    return [area, { station, observedAt, temperatureC, qualityCode }];
  })) as Record<AreaId, Observation>;
}
