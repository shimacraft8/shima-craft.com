import SunCalc from "suncalc";
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

/** A chart selection never bridges missing hours or a non-consecutive day. */
export function tideAtMinute(day: TideDay | null, tomorrow: TideDay | null, minute: number) {
  if (!day || !Number.isInteger(minute) || minute < 0 || minute > 1440) return null;
  const next = tomorrow?.date === addDays(day.date, 1) ? tomorrow : null;
  const heightCm = minute === 1440 ? next?.hourly.find(p => p.hour === 0)?.heightCm ?? null : interpolateTide(day, next, minute);
  if (heightCm === null || !Number.isFinite(heightCm)) return null;
  return { heightCm, time: `${String(Math.floor(minute / 60)).padStart(2,"0")}:${String(minute % 60).padStart(2,"0")}`, interpolated: minute % 60 !== 0 };
}

/** SunCalc 1.9.0 scans UTC days. Scan both overlapping the chosen JST day. */
export function moonForDate(iso: string, lat: number, lon: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) throw new Error("invalid-moon-input");
  const start = Date.parse(`${iso}T00:00:00+09:00`), end = start + 86400_000;
  if (!Number.isFinite(start) || todayJST(new Date(start)) !== iso) throw new Error("invalid-moon-date");
  const events = [start, end - 1].map(t => SunCalc.getMoonTimes(new Date(t), lat, lon, true));
  const event = (kind: "rise" | "set") => {
    const found = events.map(e=>e[kind]).filter((d): d is Date => !!d && d.getTime()>=start && d.getTime()<end).sort((a,b)=>a.getTime()-b.getTime())[0];
    return found ? { at: found.toISOString(), time: new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(found), azimuth: Math.round((SunCalc.getMoonPosition(found,lat,lon).azimuth*180/Math.PI+540)%360) % 360 } : null;
  };
  return {rise:event("rise"),set:event("set")};
}
export function compassRay(azimuth: number, length = 1) {
  const radians=azimuth*Math.PI/180;
  return {x:Math.sin(radians)*length,y:-Math.cos(radians)*length};
}
export function mapPoint(lat: number, lon: number, zoom = 10) {
  const scale=256*2**zoom, radians=lat*Math.PI/180;
  return {x:(lon+180)/360*scale,y:(1-Math.asinh(Math.tan(radians))/Math.PI)/2*scale};
}
