#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const inputPath = process.argv[2] ? resolve(process.argv[2]) : resolve(root, "data/raw/O9-2026.txt");

function parseEvents(line, start) {
  const events = [];
  for (let offset = start; offset < start + 28; offset += 7) {
    const timeRaw = line.slice(offset, offset + 4);
    const heightRaw = line.slice(offset + 4, offset + 7);
    if (timeRaw === "9999" && heightRaw === "999") continue;
    if (!/^[ 0-9]{4}$/.test(timeRaw) || !/^[ 0-9-]{3}$/.test(heightRaw)) {
      throw new Error(`Invalid event fields at columns ${offset + 1}-${offset + 7}`);
    }
    const time = timeRaw.trim().padStart(4, "0");
    events.push({ time: `${time.slice(0, 2)}:${time.slice(2)}`, heightCm: Number(heightRaw) });
  }
  return events;
}

function parseLine(line, index) {
  if (line.length !== 136) throw new Error(`Line ${index + 1}: expected 136 columns, got ${line.length}`);
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    time: `${String(hour).padStart(2, "0")}:00`,
    heightCm: Number(line.slice(hour * 3, hour * 3 + 3)),
  }));
  const yy = Number(line.slice(72, 74));
  const month = Number(line.slice(74, 76));
  const day = Number(line.slice(76, 78));
  const station = line.slice(78, 80);
  if (station !== "O9") throw new Error(`Line ${index + 1}: unexpected station ${station}`);
  return {
    date: `20${String(yy).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    hourly,
    highTides: parseEvents(line, 80),
    lowTides: parseEvents(line, 108),
  };
}

const raw = await readFile(inputPath);
const text = raw.toString("utf8");
const lines = text.trimEnd().split("\n");
const days = lines.map(parseLine);
const year = Number(days[0]?.date.slice(0, 4));
if (!Number.isInteger(year)) throw new Error(`Could not derive year from ${basename(inputPath)}`);
const expectedDays = new Date(Date.UTC(year + 1, 0, 1)).getUTCDate() === 1
  ? (new Date(Date.UTC(year + 1, 0, 1)).getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86_400_000
  : 365;
if (days.length !== expectedDays) throw new Error(`Expected ${expectedDays} days for ${year}, got ${days.length}`);
if (days[0].date !== `${year}-01-01` || days.at(-1).date !== `${year}-12-31`) {
  throw new Error(`The tide file does not cover all of ${year}`);
}
const outputPath = process.argv[3] ? resolve(process.argv[3]) : resolve(root, `data/generated/amami-o9-${year}.json`);

const dataset = {
  schemaVersion: 1,
  station: {
    code: "O9",
    nameJa: "奄美",
    nameEn: "AMAMI",
    locationJa: "鹿児島県奄美市 名瀬小湊",
    latitude: 28.3166667,
    longitude: 129.5333333,
    tideDatumElevationCm: -108,
    timezone: "Asia/Tokyo",
  },
  year,
  kind: "astronomical_tide_prediction",
  unit: "cm_above_tide_table_datum",
  source: {
    publisher: "気象庁",
    title: `潮位表 奄美（AMAMI） ${year}年 テキストデータ版`,
    url: `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/O9.txt`,
    pageUrl: "https://www.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=O9",
    retrievedAt: new Date().toISOString(),
    sha256: createHash("sha256").update(raw).digest("hex"),
    attribution: "気象庁「潮位表 奄美（AMAMI）」をもとにSHIMA CRAFTが表示用に加工して作成",
  },
  days,
};

await writeFile(outputPath, `${JSON.stringify(dataset)}\n`, "utf8");
console.log(`Generated ${days.length} days for ${year}: ${outputPath}`);
console.log(`Source SHA-256: ${dataset.source.sha256}`);
