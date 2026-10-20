import SunCalc from "suncalc";

export const ZONE = "Asia/Tokyo";
export const AREAS = [
  {
    id: "naze",
    name: "名瀬小湊",
    municipality: "奄美市",
    lat: 28.3166667,
    lon: 129.5333333,
    station: "O9",
  },
  {
    id: "kasari",
    name: "笠利",
    municipality: "奄美市",
    lat: 28.445,
    lon: 129.704,
    station: null,
  },
  {
    id: "koniya",
    name: "古仁屋",
    municipality: "瀬戸内町",
    lat: 28.146,
    lon: 129.314,
    station: null,
  },
] as const;
export type AreaId = (typeof AREAS)[number]["id"];
export type LoadState =
  | "ready"
  | "loading"
  | "empty"
  | "error"
  | "stale"
  | "offline";
export type Freshness = "live" | "recent" | "stale" | "unavailable" | "unknown";
export type SourceStatus = {
  sourceId: string;
  officialUrl: string;
  issuedAt: string | null;
  fetchedAt: string | null;
  checkedAt: string | null;
  expiresAt: string | null;
  freshness: Freshness;
  supersedesId?: string | null;
  cancelled?: boolean;
  partial?: boolean;
};
export type Envelope<T> = {
  schemaVersion: 1;
  mode: "demo" | "reference" | "live";
  data: T | null;
  source: SourceStatus;
};
export type HazardKind =
  | "earthquake-history"
  | "eew"
  | "tsunami"
  | "weather-warning"
  | "cyclone";
export type HazardState =
  | "unknown"
  | "announced"
  | "none-confirmed"
  | "released"
  | "cancelled"
  | "corrected";
export type HazardEvent = {
  id: string;
  eventId: string;
  kind: HazardKind;
  regionCode: string;
  revision: number;
  action: "issue" | "correct" | "cancel" | "release";
  issuedAt: string;
  title: string;
  source: SourceStatus;
  supersedesId: string | null;
};

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function todayJST(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addDays(iso: string, amount: number): string {
  if (!validDate(iso) || !Number.isInteger(amount))
    throw new Error("invalid-date");
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function timeJST(date: Date | string | null): string {
  if (date === null) return "未取得";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "日時不明";
  return (
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(parsed) + " JST"
  );
}
export function solarForDate(iso: string, lat: number, lon: number) {
  if (
    !validDate(iso) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new Error("invalid-solar-input");
  const times = SunCalc.getTimes(new Date(`${iso}T12:00:00+09:00`), lat, lon);
  const format = (date: Date) =>
    Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: ZONE,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(date)
      : null;
  const azimuth = (date: Date) =>
    Number.isFinite(date.getTime())
      ? Math.round(
          ((((SunCalc.getPosition(date, lat, lon).azimuth * 180) / Math.PI +
            180) %
            360) +
            360) %
            360,
        )
      : null;
  return {
    sunrise: format(times.sunrise),
    sunset: format(times.sunset),
    riseAzimuth: azimuth(times.sunrise),
    setAzimuth: azimuth(times.sunset),
    dusk: format(times.dusk),
  };
}
export function freshness(source: SourceStatus, now: Date): Freshness {
  if (source.freshness === "unavailable") return "unavailable";
  if (!source.issuedAt || !source.fetchedAt || !source.expiresAt)
    return "unknown";
  const issued = Date.parse(source.issuedAt),
    fetched = Date.parse(source.fetchedAt),
    expires = Date.parse(source.expiresAt);
  if (
    ![issued, fetched, expires, now.getTime()].every(Number.isFinite) ||
    issued > now.getTime() + 60_000 ||
    fetched > now.getTime() + 60_000 ||
    expires < issued ||
    issued > fetched + 60_000
  )
    return "unknown";
  if (expires <= now.getTime()) return "stale";
  if (source.partial || source.freshness === "unknown") return "unknown";
  if (source.freshness === "stale") return "stale";
  return source.freshness;
}
export function hazardLabel(
  state: HazardState,
  source: SourceStatus,
  now: Date,
): string {
  const current = freshness(source, now);
  if (current === "stale") return "期限切れ・現在の状況は未確認";
  if (current === "unknown" || current === "unavailable")
    return "現在の状況を確認できません";
  return {
    unknown: "現在の状況を確認できません",
    announced: "発表あり",
    corrected: "訂正あり",
    released: "解除の発表",
    cancelled: "取消の発表",
    "none-confirmed": "対象区域の発表なしを確認（確認時点）",
  }[state];
}
/** Normalized events only. This does not establish a complete current JMA snapshot. */
export function reduceEvents(events: HazardEvent[]): HazardEvent[] {
  const latest = new Map<string, HazardEvent>();
  for (const event of events) {
    if (
      !Number.isFinite(Date.parse(event.issuedAt)) ||
      !Number.isInteger(event.revision) ||
      event.revision < 0
    )
      throw new Error("invalid-event");
    const key = [event.kind, event.eventId, event.regionCode].join(":");
    const old = latest.get(key);
    if (old && event.revision === old.revision && event.id !== old.id)
      throw new Error("conflicting-revision");
    if (
      !old ||
      event.revision > old.revision ||
      (event.id === old.id &&
        Date.parse(event.issuedAt) > Date.parse(old.issuedAt))
    )
      latest.set(key, event);
  }
  return [...latest.values()]; // Keep cancellation/release records; never erase them.
}
export function scaleLabel(value: number | null) {
  return value === null
    ? "未判定"
    : ((
        {
          10: "1",
          20: "2",
          30: "3",
          40: "4",
          45: "5弱",
          46: "5弱以上",
          50: "5強",
          55: "6弱",
          60: "6強",
          70: "7",
        } as Record<number, string>
      )[value] ?? "不明");
}
export type TideEvent = { time: string; heightCm: number };
export type TideDay = {
  date: string;
  hourly: { hour: number; heightCm: number }[];
  highTides: TideEvent[];
  lowTides: TideEvent[];
};
export function interpolateTide(
  day: TideDay,
  next: TideDay | null,
  minute: number,
): number | null {
  if (!Number.isFinite(minute) || minute < 0 || minute >= 1440) return null;
  const h = Math.floor(minute / 60),
    a = day.hourly.find((p) => p.hour === h)?.heightCm;
  const b =
    h === 23
      ? next?.hourly.find((p) => p.hour === 0)?.heightCm
      : day.hourly.find((p) => p.hour === h + 1)?.heightCm;
  if (a == null || !Number.isFinite(a)) return null;
  if (minute % 60 === 0) return a;
  if (b == null || !Number.isFinite(b)) return null;
  return Math.round((a + ((b - a) * (minute % 60)) / 60) * 10) / 10;
}
export function parseTideText(text: string, station = "O9"): TideDay[] {
  return text
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => {
      if (line.length !== 136 || line.slice(78, 80) !== station)
        throw new Error("invalid-tide-station-or-width");
      const date = `20${line.slice(72, 74).trim().padStart(2, "0")}-${line.slice(74, 76).trim().padStart(2, "0")}-${line.slice(76, 78).trim().padStart(2, "0")}`;
      if (!validDate(date)) throw new Error("invalid-tide-date");
      const height = (raw: string) => {
        if (!/^-?\d+$/.test(raw.trim()) || raw.trim() === "")
          throw new Error("invalid-tide-height");
        const n = Number(raw);
        return n === 999 ? null : n;
      };
      const hourly = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        heightCm: height(line.slice(hour * 3, hour * 3 + 3)),
      })).filter(
        (p): p is { hour: number; heightCm: number } => p.heightCm !== null,
      );
      const events = (start: number) => {
        const out: TideEvent[] = [];
        for (let i = start; i < start + 28; i += 7) {
          const raw = line.slice(i, i + 4);
          if (raw === "9999" && line.slice(i + 4, i + 7) === "999") continue;
          const h = height(line.slice(i + 4, i + 7));
          const hour = raw.slice(0, 2).trim(),
            minute = raw.slice(2, 4).trim();
          if (
            !/^\d{1,2}$/.test(hour) ||
            !/^\d{1,2}$/.test(minute) ||
            Number(hour) > 23 ||
            Number(minute) > 59 ||
            h === null
          )
            throw new Error("invalid-tide-event");
          out.push({
            time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
            heightCm: h,
          });
        }
        return out;
      };
      return { date, hourly, highTides: events(80), lowTides: events(108) };
    });
}
export type OfficialLink = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  category: "transport" | "safety" | "explore";
  jurisdiction: string;
  checkedOn: string;
};
export const LINKS: OfficialLink[] = [
  {
    id: "airport",
    title: "奄美空港",
    subtitle: "本日のフライト・空港アクセス",
    url: "https://www.amami-airport.co.jp/flight/today",
    category: "transport",
    jurisdiction: "奄美空港",
    checkedOn: "2026-10-13",
  },
  {
    id: "aline",
    title: "A''LINE",
    subtitle: "マルエーフェリー・奄美海運",
    url: "https://www.aline-ferry.com/",
    category: "transport",
    jurisdiction: "各社航路",
    checkedOn: "2026-10-13",
  },
  {
    id: "marix",
    title: "マリックスライン",
    subtitle: "運航状況・寄港地変更",
    url: "https://marixline.com/service/",
    category: "transport",
    jurisdiction: "同社航路",
    checkedOn: "2026-10-13",
  },
  {
    id: "bus",
    title: "しまバス",
    subtitle: "公式の路線・最新時刻表",
    url: "https://shimabus.co.jp/",
    category: "transport",
    jurisdiction: "同社路線",
    checkedOn: "2026-10-13",
  },
  {
    id: "typhoon",
    title: "台風・発達する熱帯低気圧",
    subtitle: "気象庁の公式進路図",
    url: "https://www.jma.go.jp/bosai/map.html?contents=typhoon",
    category: "safety",
    jurisdiction: "気象庁対象海域",
    checkedOn: "2026-10-13",
  },
  {
    id: "quake",
    title: "地震の発表情報",
    subtitle: "気象庁・発生後の震度情報",
    url: "https://www.jma.go.jp/bosai/map.html#contents=earthquake_map",
    category: "safety",
    jurisdiction: "全国",
    checkedOn: "2026-10-13",
  },
  {
    id: "tsunami",
    title: "現在の津波警報・注意報",
    subtitle: "気象庁の公式発表で確認",
    url: "https://www.jma.go.jp/bosai/map.html#contents=tsunami",
    category: "safety",
    jurisdiction: "全国沿岸",
    checkedOn: "2026-10-13",
  },
  {
    id: "warnings",
    title: "気象警報・注意報",
    subtitle: "気象庁の防災情報",
    url: "https://www.jma.go.jp/bosai/",
    category: "safety",
    jurisdiction: "各予報区",
    checkedOn: "2026-10-13",
  },
  {
    id: "shelter",
    title: "奄美市の一時避難場所",
    subtitle: "地震・津波災害の公式一覧",
    url: "https://www.city.amami.lg.jp/somu/bosai/bosai/hinanjo/ichiji.html",
    category: "safety",
    jurisdiction: "奄美市のみ",
    checkedOn: "2026-10-13",
  },
  {
    id: "setouchi-hazard",
    title: "瀬戸内町ハザードマップ",
    subtitle: "古仁屋地区などの津波・土砂災害",
    url: "https://www.town.setouchi.lg.jp/syouboubousai/cho/kurashi/bohan/bosai/hazado.html",
    category: "safety",
    jurisdiction: "瀬戸内町のみ",
    checkedOn: "2026-10-13",
  },
  {
    id: "hazard",
    title: "奄美市ハザードマップ",
    subtitle: "津波・洪水・土砂災害",
    url: "https://www.city.amami.lg.jp/hazardmap/index.html",
    category: "safety",
    jurisdiction: "奄美市のみ",
    checkedOn: "2026-10-13",
  },
  {
    id: "tourism-taxi",
    title: "タクシー・レンタカー案内",
    subtitle: "観光物産連盟の島内交通案内",
    url: "https://www.amami-tourism.org/access/",
    category: "transport",
    jurisdiction: "奄美大島・加計呂麻島",
    checkedOn: "2026-10-14",
  },
  {
    id: "tourism-spots",
    title: "奄美の見どころ",
    subtitle: "公式観光サイトの地域・目的別検索",
    url: "https://www.amami-tourism.org/scenic-spots/",
    category: "explore",
    jurisdiction: "奄美大島・加計呂麻島",
    checkedOn: "2026-10-14",
  },
  {
    id: "tourism-guide",
    title: "観光案内所・荷物預かり",
    subtitle: "観光物産連盟の案内拠点と設備案内",
    url: "https://www.amami-tourism.org/organization/",
    category: "explore",
    jurisdiction: "島内各案内所",
    checkedOn: "2026-10-14",
  },
  {
    id: "tourism-pamphlet",
    title: "島の公式ガイドマップ",
    subtitle: "観光パンフレット・多言語版の案内",
    url: "https://www.amami-tourism.org/pamphlet/",
    category: "explore",
    jurisdiction: "奄美大島・周辺離島",
    checkedOn: "2026-10-14",
  },
  {
    id: "weather-map",
    title: "台風になる前の空を見る",
    subtitle: "気象庁の実況・予想天気図。TDは熱帯低気圧",
    url: "https://www.jma.go.jp/bosai/weather_map/",
    category: "safety",
    jurisdiction: "天気図の対象範囲",
    checkedOn: "2026-10-14",
  },
];
export const unknownSource = (
  sourceId: string,
  officialUrl: string,
): SourceStatus => ({
  sourceId,
  officialUrl,
  issuedAt: null,
  fetchedAt: null,
  checkedAt: null,
  expiresAt: null,
  freshness: "unknown",
});
export const STATE_COPY: Record<LoadState, { title: string; body: string }> = {
  ready: {
    title: "デザイン確認用デモ",
    body: "天気の数値とイラストは表示例です。現在の気象情報ではありません。",
  },
  loading: {
    title: "読み込み中",
    body: "取得が完了するまで現在の情報を判定しません。",
  },
  empty: {
    title: "表示できるデータがありません",
    body: "未取得・対象データなしの状態です。公式情報をご確認ください。",
  },
  error: {
    title: "情報を取得できませんでした",
    body: "通信または情報源の問題です。公式ページでも最新情報をご確認ください。",
  },
  stale: {
    title: "情報の有効期限が切れています",
    body: "保存した過去の情報は現在の状況を示しません。",
  },
  offline: {
    title: "オフラインです",
    body: "保存済みの情報を表示しています。外部サイトの閲覧と速報の更新には通信が必要です。",
  },
};
export function phoneUri(number: string, verified: boolean): string | null {
  if (!verified) return null;
  const normalized = number.replace(/[- ()]/g, "");
  return /^(110|119|0\d{9,10})$/.test(normalized) ? `tel:${normalized}` : null;
}

export function safetyLinks(areaId: AreaId) {
  return LINKS.filter(
    (l) =>
      l.category === "safety" &&
      (areaId === "koniya"
        ? !["hazard", "shelter"].includes(l.id)
        : l.id !== "setouchi-hazard"),
  );
}

const OFFICIAL_HOSTS = new Set([
  ...LINKS.map((link) => new URL(link.url).hostname),
  "www.jma.go.jp", "www.data.jma.go.jp",
]);
export function officialUrlAllowed(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && OFFICIAL_HOSTS.has(url.hostname);
  } catch { return false; }
}
