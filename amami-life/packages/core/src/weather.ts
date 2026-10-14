import { todayJST, validDate, type AreaId, type Envelope } from "./index.ts";

export const JMA_FORECAST_URL =
  "https://www.jma.go.jp/bosai/forecast/data/forecast/460100.json";
export const JMA_FORECAST_PAGE =
  "https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=460040";
export type ForecastDay = {
  date: string;
  region: { code: "460040"; name: "奄美地方" };
  description: string | null;
  textIssuedAt: string | null;
  codeIssuedAt: string | null;
  weeklyIssuedAt: string | null;
  weatherCode: string | null;
  wind: string | null;
  waves: string | null;
  precipitation: {
    startsAt: string;
    percent: number | null;
    issuedAt: string;
  }[];
  weeklyPrecipitation: number | null;
  reliability: string | null;
  temperature: {
    stationCode: "88837";
    stationName: "名瀬";
    minC: number | null;
    maxC: number | null;
    issuedAt: string;
  } | null;
  reportTimes: string[];
};
export type WeatherEnvelope = Envelope<ForecastDay> & {
  status: "ready" | "empty" | "stale" | "unavailable" | "refresh-failed";
  lastAttemptAt: string | null;
  refreshPolicy: string;
};
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid-forecast-record");
  return value as RecordValue;
}
function timestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !validDate(value.slice(0, 10)) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("invalid-forecast-time");
  return new Date(value).toISOString();
}
function values(area: RecordValue, key: string, size: number): string[] | null {
  if (!(key in area)) return null;
  const list = area[key];
  if (
    !Array.isArray(list) ||
    list.length !== size ||
    !list.every((x) => typeof x === "string")
  )
    throw new Error("forecast-axis-mismatch:" + key);
  return list as string[];
}
function number(
  value: string | undefined,
  min: number,
  max: number,
): number | null {
  if (value === undefined || value === "") return null;
  if (!/^-?\d+(?:\.\d+)?$/.test(value))
    throw new Error("invalid-forecast-number");
  const n = Number(value);
  if (n < min || n > max) throw new Error("forecast-number-out-of-range");
  return n;
}

/** Align every field to its own series axis. Never treat forecast/climatology as observations. */
export function parseJmaForecast(input: unknown): ForecastDay[] {
  if (!Array.isArray(input) || input.length === 0)
    throw new Error("invalid-forecast");
  const days = new Map<string, ForecastDay>();
  const getDay = (time: string, issuedAt: string) => {
    const date = todayJST(new Date(time));
    let day = days.get(date);
    if (!day) {
      day = {
        date,
        region: { code: "460040", name: "奄美地方" },
        description: null,
        textIssuedAt: null,
        codeIssuedAt: null,
        weeklyIssuedAt: null,
        weatherCode: null,
        wind: null,
        waves: null,
        precipitation: [],
        weeklyPrecipitation: null,
        reliability: null,
        temperature: null,
        reportTimes: [],
      };
      days.set(date, day);
    }
    if (!day.reportTimes.includes(issuedAt)) day.reportTimes.push(issuedAt);
    return day;
  };
  let hasRegionalWeather = false;
  for (const rawBlock of input) {
    const block = record(rawBlock),
      issuedAt = timestamp(block.reportDatetime);
    if (!Array.isArray(block.timeSeries))
      throw new Error("missing-forecast-series");
    for (const rawSeries of block.timeSeries) {
      const series = record(rawSeries);
      if (
        !Array.isArray(series.timeDefines) ||
        !series.timeDefines.length ||
        !Array.isArray(series.areas)
      )
        throw new Error("invalid-forecast-axis");
      const times = series.timeDefines.map(timestamp);
      if (
        times.some((t, i) => i > 0 && Date.parse(t) <= Date.parse(times[i - 1]))
      ) {
        // The short temperature series has a non-chronological, paired max/min axis.
        // It is deliberately excluded until those semantics are separately verified.
        if (series.areas.some((a) => "temps" in record(a))) continue;
        throw new Error("unordered-forecast-axis");
      }
      for (const rawArea of series.areas) {
        const area = record(rawArea),
          meta = record(area.area);
        if (meta.code === "460040") {
          const descriptions = values(area, "weathers", times.length),
            codes = values(area, "weatherCodes", times.length),
            winds = values(area, "winds", times.length),
            waves = values(area, "waves", times.length),
            pops = values(area, "pops", times.length),
            reliability = values(area, "reliabilities", times.length);
          if (descriptions || codes) hasRegionalWeather = true;
          if (
            pops &&
            !codes &&
            times.some((t, i) => {
              const local = new Date(Date.parse(t) + 9 * 60 * 60_000);
              return (
                local.getUTCMinutes() !== 0 ||
                local.getUTCHours() % 6 !== 0 ||
                (i > 0 &&
                  Date.parse(t) - Date.parse(times[i - 1]) !== 6 * 60 * 60_000)
              );
            })
          )
            throw new Error("invalid-six-hour-pop-axis");
          times.forEach((t, i) => {
            const day = getDay(t, issuedAt);
            if (descriptions)
              day.description =
                descriptions[i].replace(/\s+/g, " ").trim() || null;
            if (descriptions || winds || waves) day.textIssuedAt = issuedAt;
            if (codes && (!day.weatherCode || descriptions)) {
              day.weatherCode = codes[i] || null;
              day.codeIssuedAt = issuedAt;
            }
            if (winds) day.wind = winds[i] || null;
            if (waves) day.waves = waves[i] || null;
            if (pops) {
              const p = number(pops[i], 0, 100);
              if (codes) {
                day.weeklyPrecipitation = p;
                day.weeklyIssuedAt = issuedAt;
                day.reliability = reliability?.[i] || null;
              } else
                day.precipitation.push({ startsAt: t, percent: p, issuedAt });
            }
          });
        } else if (
          meta.code === "88837" &&
          ("tempsMin" in area || "tempsMax" in area)
        ) {
          const min = values(area, "tempsMin", times.length),
            max = values(area, "tempsMax", times.length);
          times.forEach((t, i) => {
            const low = number(min?.[i], -60, 60),
              high = number(max?.[i], -60, 60);
            if (low !== null && high !== null && low > high)
              throw new Error("inverted-forecast-temperature");
            if (low !== null || high !== null)
              getDay(t, issuedAt).temperature = {
                stationCode: "88837",
                stationName: "名瀬",
                minC: low,
                maxC: high,
                issuedAt,
              };
          });
        }
      }
    }
  }
  if (!hasRegionalWeather) throw new Error("missing-amami-forecast");
  return [...days.values()]
    .filter((d) => d.weatherCode || d.description)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function forecastForArea(
  days: ForecastDay[],
  area: AreaId,
  date: string,
): ForecastDay | null {
  if (!validDate(date)) throw new Error("invalid-date");
  const day = days.find((d) => d.date === date);
  if (!day) return null;
  const result = { ...day, temperature: area === "naze" ? day.temperature : null };
  // Freshness is based on the fields we actually display. The unused weekly
  // series must not make a fresh short forecast appear old.
  result.reportTimes = [...new Set([
    result.textIssuedAt,
    result.description ? null : result.codeIssuedAt,
    ...result.precipitation.map(p => p.issuedAt),
    result.precipitation.length || result.weeklyPrecipitation === null ? null : result.weeklyIssuedAt,
    result.temperature?.issuedAt,
  ].filter((t): t is string => !!t))];
  return result;
}
