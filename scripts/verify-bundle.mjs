#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dataset = JSON.parse(await readFile(resolve(root, "data/generated/amami-o9-2026.json"), "utf8"));
const assertions = [];
function assert(condition, message) {
  assertions.push({ condition, message });
  if (!condition) throw new Error(message);
}
assert(dataset.days.length === 365, "365日分あること");
assert(dataset.days[0].date === "2026-01-01", "開始日が2026-01-01であること");
assert(dataset.days.at(-1).date === "2026-12-31", "終了日が2026-12-31であること");
const aug7 = dataset.days.find((day) => day.date === "2026-08-07");
assert(Boolean(aug7), "2026-08-07が存在すること");
assert(aug7.highTides[0].time === "13:43" && aug7.highTides[0].heightCm === 164, "8/7の満潮が13:43 164cmであること");
assert(aug7.lowTides[0].time === "06:46" && aug7.lowTides[0].heightCm === 68, "8/7最初の干潮が06:46 68cmであること");
assert(aug7.lowTides[1].time === "18:31" && aug7.lowTides[1].heightCm === 135, "8/7二回目の干潮が18:31 135cmであること");
assert(dataset.days.every((day) => day.hourly.length === 24), "全日24時間分あること");
assert(dataset.station.code === "O9", "地点コードがO9であること");
console.log(`OK: ${assertions.length} checks passed`);
