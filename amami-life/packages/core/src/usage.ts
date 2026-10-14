import { LINKS, safetyLinks, todayJST, addDays, interpolateTide, type AreaId, type TideDay } from "./index.ts";
import type { ForecastDay } from "./weather.ts";

const SEARCH_WORDS: Record<string, string> = {
  airport: "飛行機 航空便 エアポート airplane flight asj",
  aline: "船 フェリー ふぇりー ferry 港 海運",
  marix: "船 フェリー ふぇりー ferry 港 海運 マリックス",
  bus: "ばす バス 路線 時刻表 bus",
  shelter: "避難所 避難場所 逃げる 津波",
  hazard: "避難所 避難場所 避難地図",
  "setouchi-hazard": "避難所 避難場所 避難地図 古仁屋",
  quake: "じしん 震度 earthquake",
  tsunami: "つなみ tsunami",
  typhoon: "たいふう 台風 typhoon 熱帯低気圧 td",
  "weather-map": "天気図 てんきず 熱帯低気圧 td",
  "tourism-taxi": "たくしー タクシー レンタカー taxi 車",
  "tourism-guide": "荷物 手荷物 預かり 観光案内所",
};
function normalized(s: string) { return s.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " "); }
export function findOfficialLinks(query: string, category = "all", area: AreaId = "naze") {
  const words = normalized(query).split(" ").filter(Boolean);
  const localSafety = new Set(safetyLinks(area).map(l => l.id));
  return LINKS.filter(link => (link.category !== "safety" || localSafety.has(link.id)) &&
    (category === "all" || category === link.category) &&
    words.every(word => normalized([link.title, link.subtitle, link.jurisdiction, SEARCH_WORDS[link.id] ?? ""].join(" ")).includes(word)));
}
export function nextTideEvent(day: TideDay | null, tomorrow: TideDay | null, now: Date, kind?: "満潮" | "干潮") {
  if (!day) return null;
  const current = day.date === todayJST(now);
  const days = [day, ...(current && tomorrow?.date === addDays(day.date, 1) ? [tomorrow] : [])];
  return days.flatMap(d => [
    ...d.highTides.map(t => ({ ...t, kind: "満潮" as const, date: d.date })),
    ...d.lowTides.map(t => ({ ...t, kind: "干潮" as const, date: d.date })),
  ]).filter(t => (!kind || t.kind === kind) && (!current || Date.parse(`${t.date}T${t.time}:00+09:00`) >= now.getTime()))
    .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time))[0] ?? null;
}
export function tideOverview(day: TideDay | null, tomorrow: TideDay | null, now: Date) {
  const next = day && tomorrow?.date === addDays(day.date, 1) ? tomorrow : null;
  const jst = new Date(now.getTime() + 9 * 60 * 60_000);
  const minute = day?.date === todayJST(now) ? jst.getUTCHours() * 60 + jst.getUTCMinutes() + jst.getUTCSeconds() / 60 : null;
  const heightCm = day && minute !== null ? interpolateTide(day, next, minute) : null;
  const segments: { minute: number; heightCm: number }[][] = [];
  let segment: { minute: number; heightCm: number }[] = [];
  for (let hour = 0; hour <= 24; hour++) {
    const height = hour === 24 ? next?.hourly.find(p => p.hour === 0)?.heightCm : day?.hourly.find(p => p.hour === hour)?.heightCm;
    if (typeof height === "number" && Number.isFinite(height)) segment.push({ minute: hour * 60, heightCm: height });
    else if (segment.length) { segments.push(segment); segment = []; }
  }
  if (segment.length) segments.push(segment);
  const heights = segments.flat().map(p => p.heightCm);
  const hour = minute === null ? null : Math.floor(minute / 60);
  const a = hour === null ? null : day?.hourly.find(p => p.hour === hour)?.heightCm;
  const b = hour === null ? null : hour === 23 ? next?.hourly.find(p => p.hour === 0)?.heightCm : day?.hourly.find(p => p.hour === hour + 1)?.heightCm;
  const trend = heightCm === null || a == null || b == null ? null : b > a ? "満ちる傾向" : b < a ? "引く傾向" : "ほぼ横ばい";
  return { minute, heightCm, trend, high: nextTideEvent(day, next, now, "満潮"), low: nextTideEvent(day, next, now, "干潮"), segments, min: heights.length ? Math.min(...heights) : null, max: heights.length ? Math.max(...heights) : null };
}
export function precipitationWindow(day: ForecastDay | null, now: Date) {
  if (!day) return null;
  const selectedToday = day.date === todayJST(now);
  const p = day.precipitation.find(p => !selectedToday || Date.parse(p.startsAt) + 6 * 60 * 60_000 > now.getTime());
  if (!p) return null;
  const hour = new Date(Date.parse(p.startsAt) + 9 * 60 * 60_000).getUTCHours();
  return { percent: p.percent, label: `${hour}–${hour + 6 === 24 ? "翌0" : hour + 6}時`, issuedAt: p.issuedAt };
}

// A failed older write cannot overwrite a newer memo. All preference writes
// are serialized, and a rejected write does not poison later attempts.
export function createOrderedWriter(write: (key: string, value: string) => Promise<unknown>) {
  let pending: Promise<unknown> = Promise.resolve();
  return (key: string, value: string) => {
    const next = pending.catch(() => undefined).then(() => write(key, value));
    pending = next;
    return next;
  };
}
