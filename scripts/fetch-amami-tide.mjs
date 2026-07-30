#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const year = process.argv[2] ?? "2026";
if (!/^20\d{2}$/.test(year)) throw new Error("Year must be four digits");
const root = resolve(new URL("..", import.meta.url).pathname);
const destination = resolve(root, `data/raw/O9-${year}.txt`);
const url = `https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/${year}/O9.txt`;
const response = await fetch(url, { headers: { "User-Agent": "SHIMA-CRAFT-Amami-Tide/1.0 (+https://shima-craft.com)" } });
if (!response.ok) throw new Error(`JMA responded ${response.status}`);
const text = await response.text();
const lines = text.trimEnd().split("\n");
if (lines.length < 365 || lines.some((line) => line.length !== 136)) throw new Error("Unexpected JMA tide format");
await writeFile(destination, text, "utf8");
console.log(`Saved ${url} -> ${destination}`);
