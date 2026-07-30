import type { WeatherDay, WeatherPayload } from "./types";

const JMA_FORECAST_URL = "https://www.jma.go.jp/bosai/forecast/data/forecast/460100.json";
const CACHE_SECONDS = 60 * 60;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function datePart(value: string): string {
  return value.slice(0, 10);
}

function getOrCreate(map: Map<string, WeatherDay>, date: string): WeatherDay {
  const existing = map.get(date);
  if (existing) return existing;
  const created: WeatherDay = {
    date,
    weatherCode: null,
    weatherText: null,
    minTempC: null,
    maxTempC: null,
    precipitationProbability: null,
    windText: null,
    waveText: null,
  };
  map.set(date, created);
  return created;
}

function matchesAmami(name: string): boolean {
  return name.includes("奄美") || name.includes("大島");
}

function matchesNaze(name: string): boolean {
  return name.includes("名瀬");
}

function applyAlignedValues(args: {
  dayMap: Map<string, WeatherDay>;
  timeDefines: string[];
  values: string[];
  setter: (day: WeatherDay, value: string) => void;
}): void {
  const { dayMap, timeDefines, values, setter } = args;
  timeDefines.forEach((time, index) => {
    const value = values[index];
    if (typeof value !== "string") return;
    setter(getOrCreate(dayMap, datePart(time)), value);
  });
}

function mergePrecipitation(day: WeatherDay, value: string): void {
  const probability = toNumberOrNull(value);
  if (probability === null) return;
  day.precipitationProbability = Math.max(day.precipitationProbability ?? 0, probability);
}

function parseForecastPayload(raw: unknown): WeatherPayload {
  if (!Array.isArray(raw)) throw new Error("JMA forecast payload is not an array");
  const dayMap = new Map<string, WeatherDay>();
  let publishedAt: string | null = null;

  for (const blockValue of raw) {
    const block = asRecord(blockValue);
    if (!block) continue;
    if (typeof block.reportDatetime === "string" && !publishedAt) publishedAt = block.reportDatetime;
    const timeSeriesList = Array.isArray(block.timeSeries) ? block.timeSeries : [];

    for (const seriesValue of timeSeriesList) {
      const series = asRecord(seriesValue);
      if (!series) continue;
      const timeDefines = asStringArray(series.timeDefines);
      const areas = Array.isArray(series.areas) ? series.areas : [];

      for (const areaValue of areas) {
        const area = asRecord(areaValue);
        if (!area) continue;
        const areaMeta = asRecord(area.area);
        const name = typeof areaMeta?.name === "string" ? areaMeta.name : "";
        const isAmami = matchesAmami(name);
        const isNaze = matchesNaze(name);
        if (!isAmami && !isNaze) continue;

        if (isAmami) {
          applyAlignedValues({
            dayMap,
            timeDefines,
            values: asStringArray(area.weatherCodes),
            setter: (day, value) => { day.weatherCode = value; },
          });
          applyAlignedValues({
            dayMap,
            timeDefines,
            values: asStringArray(area.weathers),
            setter: (day, value) => { day.weatherText = value.replace(/　/g, " "); },
          });
          applyAlignedValues({
            dayMap,
            timeDefines,
            values: asStringArray(area.winds),
            setter: (day, value) => { day.windText = value.replace(/　/g, " "); },
          });
          applyAlignedValues({
            dayMap,
            timeDefines,
            values: asStringArray(area.waves),
            setter: (day, value) => { day.waveText = value.replace(/　/g, " "); },
          });
          applyAlignedValues({
            dayMap,
            timeDefines,
            values: asStringArray(area.pops),
            setter: mergePrecipitation,
          });
          applyAlignedValues({
            dayMap,
            timeDefines,
            values: asStringArray(area.tempsMin),
            setter: (day, value) => { day.minTempC = toNumberOrNull(value); },
          });
          applyAlignedValues({
            dayMap,
            timeDefines,
            values: asStringArray(area.tempsMax),
            setter: (day, value) => { day.maxTempC = toNumberOrNull(value); },
          });
        }

        if (isNaze) {
          const temps = asStringArray(area.temps);
          timeDefines.forEach((time, index) => {
            const temp = toNumberOrNull(temps[index]);
            if (temp === null) return;
            const day = getOrCreate(dayMap, datePart(time));
            const hour = Number(time.slice(11, 13));
            if (hour <= 9 && day.minTempC === null) day.minTempC = temp;
            if (hour >= 9) day.maxTempC = Math.max(day.maxTempC ?? temp, temp);
          });
        }
      }
    }
  }

  const days = Array.from(dayMap.values())
    .filter((day) => day.weatherCode || day.weatherText || day.minTempC !== null || day.maxTempC !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  if (days.length === 0) throw new Error("JMA forecast did not include an Amami area");

  return {
    provider: "jma",
    areaName: "奄美地方（名瀬を含む予報区）",
    publishedAt,
    fetchedAt: new Date().toISOString(),
    days,
    stale: false,
  };
}

export async function getAmamiWeather(): Promise<WeatherPayload | null> {
  try {
    const response = await fetch(JMA_FORECAST_URL, {
      headers: {
        "User-Agent": "SHIMA-CRAFT-Amami-Tide/1.0 (+https://shima-craft.com)",
      },
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) throw new Error(`JMA forecast responded ${response.status}`);
    return parseForecastPayload(await response.json());
  } catch (error) {
    console.error("Failed to fetch JMA Amami weather", error);
    return null;
  }
}

export function weatherCodeLabel(code: string | null, fallback: string | null): string {
  if (fallback) {
    const compact = fallback
      .replace(/所により.+$/, "")
      .replace(/夜遅く.+$/, "")
      .trim();
    if (compact) return compact;
  }
  if (!code) return "天気情報なし";
  const first = code[0];
  if (first === "1") return "晴れ";
  if (first === "2") return "くもり";
  if (first === "3") return "雨";
  if (first === "4") return "雪";
  return "天気予報";
}

export function weatherIconKind(code: string | null): "sun" | "cloud" | "rain" | "mixed" {
  if (!code) return "mixed";
  if (code.startsWith("1")) return code === "100" ? "sun" : "mixed";
  if (code.startsWith("2")) return "cloud";
  if (code.startsWith("3") || code.startsWith("4")) return "rain";
  return "mixed";
}

export { parseForecastPayload };
