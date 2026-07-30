import type {
  ActivityWindow,
  TideDataset,
  TideDay,
  TideEvent,
  TideSnapshot,
  TideTrend,
} from "./types";

export const AMAMI_TIDE_THRESHOLD_CM = 110;

export function getTideDay(dataset: TideDataset, date: string): TideDay | null {
  return dataset.days.find((day) => day.date === date) ?? null;
}

export function minutesFromTime(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function timeFromMinutes(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function interpolateTideHeight(day: TideDay, minuteOfDay: number): number {
  const clamped = Math.max(0, Math.min(1439, minuteOfDay));
  const lowerHour = Math.floor(clamped / 60);
  const upperHour = Math.min(23, lowerHour + 1);
  const lower = day.hourly[lowerHour]?.heightCm ?? 0;
  const upper = day.hourly[upperHour]?.heightCm ?? lower;
  if (lowerHour === upperHour) return lower;
  const ratio = (clamped - lowerHour * 60) / 60;
  return Math.round((lower + (upper - lower) * ratio) * 10) / 10;
}

function trendFromDifference(diff: number, distanceToHigh: number, distanceToLow: number): TideTrend {
  if (distanceToHigh <= 20) return "near-high";
  if (distanceToLow <= 20) return "near-low";
  if (diff > 0.8) return "rising";
  if (diff < -0.8) return "falling";
  return "steady";
}

function nextEvent(events: TideEvent[], minuteOfDay: number): TideEvent | null {
  return events.find((event) => minutesFromTime(event.time) >= minuteOfDay) ?? null;
}

export function getTideSnapshot(day: TideDay, minuteOfDay: number): TideSnapshot {
  const current = interpolateTideHeight(day, minuteOfDay);
  const before = interpolateTideHeight(day, Math.max(0, minuteOfDay - 15));
  const after = interpolateTideHeight(day, Math.min(1439, minuteOfDay + 15));
  const nearestHighDistance = Math.min(
    ...day.highTides.map((event) => Math.abs(minutesFromTime(event.time) - minuteOfDay)),
    Number.POSITIVE_INFINITY,
  );
  const nearestLowDistance = Math.min(
    ...day.lowTides.map((event) => Math.abs(minutesFromTime(event.time) - minuteOfDay)),
    Number.POSITIVE_INFINITY,
  );

  return {
    estimatedHeightCm: current,
    trend: trendFromDifference(after - before, nearestHighDistance, nearestLowDistance),
    nextHigh: nextEvent(day.highTides, minuteOfDay),
    nextLow: nextEvent(day.lowTides, minuteOfDay),
  };
}

export function tideTrendLabel(trend: TideTrend): string {
  switch (trend) {
    case "rising":
      return "潮がゆっくり満ちています";
    case "falling":
      return "潮がゆっくり引いています";
    case "near-high":
      return "まもなく満潮です";
    case "near-low":
      return "まもなく干潮です";
    default:
      return "潮の動きが穏やかな時間です";
  }
}

function thresholdWindows(day: TideDay, thresholdCm: number): Array<{ start: number; end: number }> {
  const points = day.hourly.map((item) => ({ minute: item.hour * 60, value: item.heightCm }));
  points.push({ minute: 1440, value: day.hourly[23]?.heightCm ?? 0 });

  const crossings: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const aAbove = a.value >= thresholdCm;
    const bAbove = b.value >= thresholdCm;
    if (aAbove === bAbove) continue;
    const ratio = (thresholdCm - a.value) / (b.value - a.value);
    crossings.push(a.minute + ratio * (b.minute - a.minute));
  }

  const windows: Array<{ start: number; end: number }> = [];
  let activeStart: number | null = points[0].value >= thresholdCm ? 0 : null;
  for (const crossing of crossings) {
    if (activeStart === null) activeStart = crossing;
    else {
      windows.push({ start: activeStart, end: crossing });
      activeStart = null;
    }
  }
  if (activeStart !== null) windows.push({ start: activeStart, end: 1440 });
  return windows;
}

function pickDaytimeWindow(
  windows: Array<{ start: number; end: number }>,
  dayStart = 7 * 60,
  dayEnd = 18 * 60,
): { start: number; end: number } | null {
  return windows
    .map((window) => ({
      start: Math.max(window.start, dayStart),
      end: Math.min(window.end, dayEnd),
    }))
    .filter((window) => window.end - window.start >= 30)
    .sort((a, b) => b.end - b.start - (a.end - a.start))[0] ?? null;
}

export function buildActivityWindows(args: {
  day: TideDay;
  sunrise: string;
  sunset: string;
  moonIllumination: number;
}): ActivityWindow[] {
  const { day, sunset, moonIllumination } = args;
  const thresholdRanges = thresholdWindows(day, AMAMI_TIDE_THRESHOLD_CM);
  const daytimeHigh = day.highTides
    .filter((event) => {
      const minute = minutesFromTime(event.time);
      return minute >= 6 * 60 && minute <= 19 * 60;
    })
    .sort((a, b) => b.heightCm - a.heightCm)[0];
  const highMinute = daytimeHigh ? minutesFromTime(daytimeHigh.time) : null;
  const containingRange = highMinute === null
    ? null
    : thresholdRanges.find((range) => range.start <= highMinute && range.end >= highMinute) ?? null;
  const mangrove = highMinute === null
    ? pickDaytimeWindow(thresholdRanges)
    : {
      start: Math.max(7 * 60, highMinute - 150, containingRange?.start ?? 0),
      end: Math.min(18 * 60, highMinute + 150, containingRange?.end ?? 1440),
    };
  const daytimeLow = day.lowTides
    .filter((event) => {
      const minute = minutesFromTime(event.time);
      return minute >= 5 * 60 && minute <= 19 * 60;
    })
    .sort((a, b) => a.heightCm - b.heightCm)[0];

  const sunsetMinute = minutesFromTime(sunset);
  const stargazingStart = Math.min(23 * 60, sunsetMinute + 90);

  return [
    {
      id: "mangrove",
      title: "マングローブ",
      start: mangrove ? timeFromMinutes(mangrove.start) : null,
      end: mangrove ? timeFromMinutes(mangrove.end) : null,
      label: mangrove ? "水位が上がる参考時間" : "事業者へ確認",
      tone: mangrove ? "best" : "check",
      note: "催行時間や通行可能な水位はコースごとに異なります。予約先の案内を優先してください。",
    },
    {
      id: "shore",
      title: "海辺散策",
      start: daytimeLow ? timeFromMinutes(Math.max(0, minutesFromTime(daytimeLow.time) - 60)) : null,
      end: daytimeLow ? timeFromMinutes(Math.min(1439, minutesFromTime(daytimeLow.time) + 60)) : null,
      label: daytimeLow ? "浜が広く見えやすい目安" : "現地状況を確認",
      tone: daytimeLow ? "good" : "check",
      note: "岩場やリーフは滑りやすいため、波・風・立入情報を必ず確認してください。",
    },
    {
      id: "sunset",
      title: "夕日鑑賞",
      start: timeFromMinutes(Math.max(0, sunsetMinute - 40)),
      end: timeFromMinutes(Math.min(1439, sunsetMinute + 10)),
      label: `日の入り ${sunset}`,
      tone: "best",
      note: "駐車や移動時間を考え、日の入り40分前までの到着がおすすめです。",
    },
    {
      id: "stars",
      title: "星空観察",
      start: timeFromMinutes(stargazingStart),
      end: "23:59",
      label: moonIllumination < 0.35 ? "月明かりの影響が少なめ" : "月明かりあり",
      tone: moonIllumination < 0.35 ? "best" : "good",
      note: "雲量や街明かりでも見え方が変わります。夜間の移動は安全を優先してください。",
    },
  ];
}

export function buildPlainLanguageSummary(args: {
  dateLabel: string;
  stationLabel: string;
  day: TideDay;
  sunrise: string;
  sunset: string;
}): string {
  const { dateLabel, stationLabel, day, sunrise, sunset } = args;
  const highs = day.highTides.map((item) => `${item.time}（${item.heightCm}cm）`).join("、") || "該当なし";
  const lows = day.lowTides.map((item) => `${item.time}（${item.heightCm}cm）`).join("、") || "該当なし";
  return `${dateLabel}の${stationLabel}周辺は、満潮が${highs}、干潮が${lows}の予測です。日の出は${sunrise}、日の入りは${sunset}です。潮位は天文潮位の予測値で、風や気圧などにより実際の海面と異なる場合があります。`;
}
