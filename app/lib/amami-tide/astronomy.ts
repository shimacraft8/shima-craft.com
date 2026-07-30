const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = RAD * 23.4397;

function toJulian(date: Date): number {
  return date.getTime() / DAY_MS - 0.5 + J1970;
}

function fromJulian(julian: number): Date {
  return new Date((julian + 0.5 - J1970) * DAY_MS);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

function solarMeanAnomaly(days: number): number {
  return RAD * (357.5291 + 0.98560028 * days);
}

function eclipticLongitude(meanAnomaly: number): number {
  const equationOfCenter = RAD * (
    1.9148 * Math.sin(meanAnomaly)
    + 0.02 * Math.sin(2 * meanAnomaly)
    + 0.0003 * Math.sin(3 * meanAnomaly)
  );
  const perihelion = RAD * 102.9372;
  return meanAnomaly + equationOfCenter + perihelion + Math.PI;
}

function declination(eclipticLongitudeValue: number): number {
  return Math.asin(Math.sin(eclipticLongitudeValue) * Math.sin(OBLIQUITY));
}

function julianCycle(days: number, longitudeWest: number): number {
  return Math.round(days - 0.0009 - longitudeWest / (2 * Math.PI));
}

function approxTransit(hourAngle: number, longitudeWest: number, cycle: number): number {
  return 0.0009 + (hourAngle + longitudeWest) / (2 * Math.PI) + cycle;
}

function solarTransitJulian(transit: number, meanAnomaly: number, eclipticLongitudeValue: number): number {
  return J2000 + transit + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * eclipticLongitudeValue);
}

function hourAngle(altitude: number, latitude: number, solarDeclination: number): number {
  const numerator = Math.sin(altitude) - Math.sin(latitude) * Math.sin(solarDeclination);
  const denominator = Math.cos(latitude) * Math.cos(solarDeclination);
  return Math.acos(Math.max(-1, Math.min(1, numerator / denominator)));
}

function formatTokyoTime(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function calculateSunTimes(dateIso: string, latitude: number, longitude: number): {
  sunrise: string;
  sunset: string;
  solarNoon: string;
} {
  // JSTの正午を基準にして対象日を固定する。
  const base = new Date(`${dateIso}T12:00:00+09:00`);
  const longitudeWest = RAD * -longitude;
  const latitudeRad = RAD * latitude;
  const days = toDays(base);
  const cycle = julianCycle(days, longitudeWest);
  const transitApprox = approxTransit(0, longitudeWest, cycle);
  const meanAnomaly = solarMeanAnomaly(transitApprox);
  const longitudeEcliptic = eclipticLongitude(meanAnomaly);
  const solarDeclination = declination(longitudeEcliptic);
  const transitJulian = solarTransitJulian(transitApprox, meanAnomaly, longitudeEcliptic);
  const altitude = RAD * -0.833;
  const angle = hourAngle(altitude, latitudeRad, solarDeclination);
  const setApprox = approxTransit(angle, longitudeWest, cycle);
  const setJulian = solarTransitJulian(setApprox, meanAnomaly, longitudeEcliptic);
  const riseJulian = transitJulian - (setJulian - transitJulian);

  return {
    sunrise: formatTokyoTime(fromJulian(riseJulian)),
    sunset: formatTokyoTime(fromJulian(setJulian)),
    solarNoon: formatTokyoTime(fromJulian(transitJulian)),
  };
}

const SYNODIC_MONTH = 29.53058867;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);

export function calculateMoonPhase(dateIso: string): {
  age: number;
  illumination: number;
  label: string;
} {
  const time = new Date(`${dateIso}T12:00:00+09:00`).getTime();
  const elapsedDays = (time - KNOWN_NEW_MOON_UTC) / DAY_MS;
  const normalized = ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phase = normalized / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;

  let label = "月の満ち欠け";
  if (normalized < 1.5 || normalized > SYNODIC_MONTH - 1.5) label = "新月ごろ";
  else if (normalized < 6.5) label = "満ちていく細い月";
  else if (normalized < 9.5) label = "上弦ごろ";
  else if (normalized < 13.5) label = "満ちていく月";
  else if (normalized < 16.5) label = "満月ごろ";
  else if (normalized < 21.5) label = "欠けていく月";
  else if (normalized < 24.5) label = "下弦ごろ";
  else label = "新月へ向かう月";

  return {
    age: Math.round(normalized * 10) / 10,
    illumination: Math.round(illumination * 1000) / 1000,
    label,
  };
}
