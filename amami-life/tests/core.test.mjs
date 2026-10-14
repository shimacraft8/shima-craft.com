import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  AREAS,
  validDate,
  todayJST,
  addDays,
  solarForDate,
  freshness,
  hazardLabel,
  unknownSource,
  reduceEvents,
  scaleLabel,
  parseTideText,
  interpolateTide,
  phoneUri,
  safetyLinks,
} from "../packages/core/src/index.ts";
import { api } from "../server/index.mjs";
const now = new Date("2026-10-13T04:00:00Z");
const source = {
  sourceId: "fixture",
  officialUrl: "https://www.jma.go.jp/bosai/",
  issuedAt: "2026-10-13T03:50:00Z",
  fetchedAt: "2026-10-13T03:51:00Z",
  checkedAt: "2026-10-13T03:51:00Z",
  expiresAt: "2026-10-13T04:10:00Z",
  freshness: "recent",
};
const event = (revision, action = "issue", other = {}) => ({
  id: `id${revision}`,
  eventId: "typhoon-test",
  kind: "cyclone",
  regionCode: "test-only",
  revision,
  action,
  issuedAt: "2026-10-13T03:50:00Z",
  source,
  title: "訓練fixture",
  supersedesId: revision ? `id${revision - 1}` : null,
  ...other,
});
test("JST boundary 23:59→00:00", () => {
  assert.equal(todayJST(new Date("2026-10-12T14:59:59Z")), "2026-10-12");
  assert.equal(todayJST(new Date("2026-10-12T15:00:00Z")), "2026-10-13");
});
test("real dates only; leap dates and rollover", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.throws(() => addDays("bad", 1));
});
test("solar coordinates and date validation", () => {
  assert.throws(() => solarForDate("2026-02-30", 28, 129));
  assert.throws(() => solarForDate("2026-10-13", NaN, 129));
  assert.equal(solarForDate("2026-06-21", 89, 0).sunset, null);
});
test("NAOJ Naze 2026-10-13 at sea level: within 2 min and 1 degree", () => {
  const s = solarForDate("2026-10-13", 28.3166667, 129.5333333);
  const minute = (v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  assert.ok(Math.abs(minute(s.sunrise) - (6 * 60 + 21)) <= 2);
  assert.ok(Math.abs(minute(s.sunset) - (17 * 60 + 55)) <= 2);
  assert.ok(Math.abs(s.riseAzimuth - 98.2) <= 1);
  assert.ok(Math.abs(s.setAzimuth - 261.6) <= 1);
});

test("NAOJ Kasari and Koniya at sea level: within 2 min and 1 degree", () => {
  const samples = [
    { lat: 28.445, lon: 129.704, rise: 380, set: 1074, ra: 98.2, sa: 261.5 },
    { lat: 28.146, lon: 129.314, rise: 382, set: 1076, ra: 98.2, sa: 261.6 },
  ];
  const minute = (v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
  for (const ref of samples) {
    const s = solarForDate("2026-10-13", ref.lat, ref.lon);
    assert.ok(Math.abs(minute(s.sunrise) - ref.rise) <= 2);
    assert.ok(Math.abs(minute(s.sunset) - ref.set) <= 2);
    assert.ok(Math.abs(s.riseAzimuth - ref.ra) <= 1);
    assert.ok(Math.abs(s.setAzimuth - ref.sa) <= 1);
  }
});
test("solar output does not depend on overseas system timezone", () => {
  const code =
    "import {solarForDate} from './packages/core/src/index.ts';console.log(JSON.stringify(solarForDate('2026-10-13',28.3166667,129.5333333)))";
  const run = (TZ) =>
    spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, TZ },
      encoding: "utf8",
    });
  const a = run("America/Los_Angeles"),
    b = run("Asia/Tokyo");
  assert.equal(a.status, 0);
  assert.equal(b.status, 0);
  assert.equal(a.stdout, b.stdout);
});
test("three areas calculate own solar positions", () => {
  const values = AREAS.map((a) => solarForDate("2026-06-21", a.lat, a.lon));
  assert.notDeepEqual(values[1], values[2]);
});
test("fetchedAt alone never creates freshness", () =>
  assert.equal(
    freshness(
      {
        ...unknownSource("x", "https://www.jma.go.jp"),
        fetchedAt: now.toISOString(),
      },
      now,
    ),
    "unknown",
  ));
test("expiration, future clock skew and invalid dates fail closed", () => {
  assert.equal(
    freshness({ ...source, expiresAt: now.toISOString() }, now),
    "stale",
  );
  assert.equal(
    freshness({ ...source, issuedAt: "2026-10-13T05:00:00Z" }, now),
    "unknown",
  );
  assert.equal(freshness({ ...source, expiresAt: "bad" }, now), "unknown");
  assert.equal(
    freshness(
      {
        ...source,
        issuedAt: "2026-10-13T04:00:00Z",
        fetchedAt: "2026-10-13T03:00:00Z",
      },
      now,
    ),
    "unknown",
  );
});
test("partial source cannot confirm no warnings", () => {
  assert.match(
    hazardLabel("none-confirmed", { ...source, partial: true }, now),
    /確認できません/,
  );
});
test("unknown and stale do not say safe or no warning", () => {
  for (const state of [
    "unknown",
    "announced",
    "none-confirmed",
    "released",
    "cancelled",
    "corrected",
  ]) {
    const text = hazardLabel(
      state,
      unknownSource("x", "https://www.jma.go.jp"),
      now,
    );
    assert.doesNotMatch(text, /安全|警報なし|発表なし/);
  }
  assert.match(
    hazardLabel(
      "released",
      { ...source, expiresAt: "2026-10-13T03:59:00Z" },
      now,
    ),
    /期限切れ/,
  );
});
test("corrections replace older revisions irrespective of arrival order", () => {
  assert.equal(
    reduceEvents([event(2, "correct"), event(0), event(1)])[0].action,
    "correct",
  );
});
test("cancellation preserved; old retry cannot revive event", () => {
  const result = reduceEvents([event(0), event(3, "cancel"), event(2)]);
  assert.equal(result.length, 1);
  assert.equal(result[0].action, "cancel");
});
test("release and post-typhoon stage cannot silently clear other hazards", () => {
  const result = reduceEvents([
    event(0),
    event(1, "release"),
    event(0, "issue", { kind: "weather-warning", id: "rain" }),
  ]);
  assert.equal(result.length, 2);
  assert.equal(
    result.find((x) => x.kind === "weather-warning").action,
    "issue",
  );
});
test("EEW, earthquake history, tsunami and region remain distinct", () => {
  const result = reduceEvents([
    event(0, "issue", { kind: "eew" }),
    event(0, "issue", { kind: "earthquake-history" }),
    event(0, "issue", { kind: "tsunami" }),
    event(0, "issue", { regionCode: "another-region" }),
  ]);
  assert.equal(result.length, 4);
});
test("conflicting same revision is rejected, duplicate ID is idempotent", () => {
  assert.equal(reduceEvents([event(0), event(0)]).length, 1);
  assert.throws(() =>
    reduceEvents([event(0), event(0, "issue", { id: "conflict" })]),
  );
});
test("unknown earthquake intensity never becomes zero", () => {
  assert.equal(scaleLabel(null), "未判定");
  assert.equal(scaleLabel(-1), "不明");
  assert.equal(scaleLabel(45), "5弱");
});
const raw = await readFile(
  new URL("../server/data/O9-2026.txt", import.meta.url),
  "utf8",
);
const tides = parseTideText(raw);
test("annual archive 365 continuous dates, 24 hourly values", () => {
  assert.equal(tides.length, 365);
  tides.forEach((d, i) => {
    assert.equal(d.date, addDays("2026-01-01", i));
    assert.equal(d.hourly.length, 24);
  });
});
test("O9 matches JMA official Oct 13 table, multiple highs/lows", () => {
  const d = tides.find((d) => d.date === "2026-10-13");
  assert.deepEqual(d.highTides, [
    { time: "08:01", heightCm: 203 },
    { time: "19:26", heightCm: 205 },
  ]);
  assert.deepEqual(d.lowTides, [
    { time: "01:30", heightCm: 27 },
    { time: "13:41", heightCm: 86 },
  ]);
});
test("wrong station and malformed date rejected", () => {
  const line = raw.split("\n")[0];
  assert.throws(() => parseTideText(line.replace("O9", "XX")));
  assert.throws(() =>
    parseTideText(line.slice(0, 74) + "0230" + line.slice(78)),
  );
});
test("missing hourly value stays missing instead of zero", () => {
  const line = raw.split("\n")[0];
  const d = parseTideText("999" + line.slice(3))[0];
  assert.equal(interpolateTide(d, null, 0), null);
});
test("hourly interpolation across midnight requires next-day value", () => {
  const d = tides[0],
    next = tides[1];
  assert.equal(interpolateTide(d, null, 1410), null);
  assert.equal(
    interpolateTide(d, next, 1410),
    (d.hourly[23].heightCm + next.hourly[0].heightCm) / 2,
  );
  assert.equal(interpolateTide(d, next, 1440), null);
});
test("safe phones reject unverified business and injected URI", () => {
  assert.equal(phoneUri("0997-52-0000", false), null);
  assert.equal(phoneUri("tel:119", true), null);
  assert.equal(phoneUri("119", true), "tel:119");
  assert.equal(phoneUri("0997-52-0000", true), "tel:0997520000");
});
test("API rejects invalid area/date/state", () => {
  for (const query of ["area=tokyo", "date=2026-02-30", "state=safe"])
    assert.equal(api(new URL("http://localhost/v1/today?" + query)).code, 400);
});
test("API tide station does not leak Naze values to other areas", () => {
  const naze = api(
    new URL("http://localhost/v1/tides?area=naze&date=2026-10-13"),
  );
  assert.equal(naze.body.data.highTides[0].time, "08:01");
  assert.equal(
    api(new URL("http://localhost/v1/tides?area=koniya")).body.data,
    null,
  );
});
test("all failure state fixtures: no mock weather on error/empty/loading/stale/offline", () => {
  for (const state of ["loading", "empty", "stale", "offline"]) {
    const r = api(new URL("http://localhost/v1/today?state=" + state));
    assert.equal(r.body.data.weather, null);
    assert.equal(r.body.data.hazards.state, "unknown");
  }
  assert.equal(api(new URL("http://localhost/v1/today?state=error")).code, 503);
});
test("hazards endpoint never infers none from empty history", () => {
  for (const path of ["hazards", "cyclones"]) {
    const r = api(new URL("http://localhost/v1/" + path));
    assert.equal(r.body.data.state, "unknown");
    assert.equal(r.body.source.issuedAt, null);
    assert.equal(r.body.source.expiresAt, null);
  }
});

test("municipal hazard scope follows selected area", () => {
  assert.ok(safetyLinks("koniya").some((l) => l.id === "setouchi-hazard"));
  assert.ok(!safetyLinks("koniya").some((l) => l.id === "hazard"));
  assert.ok(!safetyLinks("kasari").some((l) => l.id === "setouchi-hazard"));
});
