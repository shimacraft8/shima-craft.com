import { describe, expect, it } from "vitest";
import datasetJson from "@/data/generated/amami-o9-2026.json";
import type { TideDataset } from "./types";
import { calculateMoonPhase, calculateSunTimes } from "./astronomy";
import { buildActivityWindows, getTideDay, getTideSnapshot, interpolateTideHeight } from "./tide";

const dataset = datasetJson as TideDataset;

describe("2026 Amami tide dataset", () => {
  it("contains every day of 2026", () => {
    expect(dataset.days).toHaveLength(365);
    expect(dataset.days[0].date).toBe("2026-01-01");
    expect(dataset.days.at(-1)?.date).toBe("2026-12-31");
  });

  it("matches the JMA published values for 2026-08-07", () => {
    const day = getTideDay(dataset, "2026-08-07");
    expect(day?.highTides).toEqual([{ time: "13:43", heightCm: 164 }]);
    expect(day?.lowTides).toEqual([
      { time: "06:46", heightCm: 68 },
      { time: "18:31", heightCm: 135 },
    ]);
  });

  it("interpolates between official hourly values without overshoot", () => {
    const day = getTideDay(dataset, "2026-08-07")!;
    expect(interpolateTideHeight(day, 10 * 60 + 30)).toBe(125);
    expect(getTideSnapshot(day, 10 * 60 + 30).trend).toBe("rising");
  });

  it("builds tourist-oriented reference windows", () => {
    const day = getTideDay(dataset, "2026-08-07")!;
    const sun = calculateSunTimes(day.date, dataset.station.latitude, dataset.station.longitude);
    const moon = calculateMoonPhase(day.date);
    const activities = buildActivityWindows({ day, sunrise: sun.sunrise, sunset: sun.sunset, moonIllumination: moon.illumination });
    expect(activities).toHaveLength(4);
    expect(activities.find((item) => item.id === "mangrove")?.start).toMatch(/^\d{2}:\d{2}$/);
  });
});

import weatherFixture from "./__fixtures__/jma-forecast-460100.sample.json";
import { parseForecastPayload } from "./weather";

describe("JMA Amami weather parser", () => {
  it("extracts Amami weather and Naze temperatures", () => {
    const parsed = parseForecastPayload(weatherFixture);
    expect(parsed.days[0]).toMatchObject({
      date: "2026-07-30",
      weatherCode: "101",
      minTempC: 26,
      maxTempC: 31,
      precipitationProbability: 30,
    });
    expect(parsed.days[2]).toMatchObject({ date: "2026-08-01", minTempC: 25, maxTempC: 32 });
  });
});
