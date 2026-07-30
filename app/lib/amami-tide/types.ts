export type TideEvent = {
  time: string;
  heightCm: number;
};

export type HourlyTide = {
  hour: number;
  time: string;
  heightCm: number;
};

export type TideDay = {
  date: string;
  hourly: HourlyTide[];
  highTides: TideEvent[];
  lowTides: TideEvent[];
};

export type TideDataset = {
  schemaVersion: number;
  station: {
    code: string;
    nameJa: string;
    nameEn: string;
    locationJa: string;
    latitude: number;
    longitude: number;
    tideDatumElevationCm: number;
    timezone: string;
  };
  year: number;
  kind: "astronomical_tide_prediction";
  unit: "cm_above_tide_table_datum";
  source: {
    publisher: string;
    title: string;
    url: string;
    pageUrl: string;
    retrievedAt: string;
    sha256: string;
    attribution: string;
  };
  days: TideDay[];
};

export type TideTrend = "rising" | "falling" | "near-high" | "near-low" | "steady";

export type TideSnapshot = {
  estimatedHeightCm: number;
  trend: TideTrend;
  nextHigh: TideEvent | null;
  nextLow: TideEvent | null;
};

export type ActivityWindow = {
  id: "mangrove" | "shore" | "sunset" | "stars";
  title: string;
  start: string | null;
  end: string | null;
  label: string;
  tone: "best" | "good" | "check";
  note: string;
};

export type WeatherDay = {
  date: string;
  weatherCode: string | null;
  weatherText: string | null;
  minTempC: number | null;
  maxTempC: number | null;
  precipitationProbability: number | null;
  windText: string | null;
  waveText: string | null;
};

export type WeatherPayload = {
  provider: "jma";
  areaName: string;
  publishedAt: string | null;
  fetchedAt: string;
  days: WeatherDay[];
  stale: boolean;
};
