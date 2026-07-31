#!/usr/bin/env node
/**
 * Cloudflare Workers Static Assets は1ファイル25MiBまでという上限があるため、
 * ビルド成果物（.open-next/assets、無ければ public/）にそれを超えるファイルが
 * 無いかを検査する。超過があればエラー終了する（cf:buildの後段で実行する想定）。
 *
 * 実行: node scripts/check-static-asset-sizes.mjs
 */
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

// Cloudflare Workers Static Assetsの実際の上限（安全マージンなしの厳密値）。
const CLOUDFLARE_MAX_ASSET_BYTES = 25 * 1024 * 1024;

const CANDIDATE_DIRS = [".open-next/assets", "public"];

async function findTargetDir() {
  for (const dir of CANDIDATE_DIRS) {
    const abs = resolve(root, dir);
    try {
      await stat(abs);
      return abs;
    } catch {
      // 次の候補へ
    }
  }
  throw new Error(`検査対象ディレクトリが見つかりません（候補: ${CANDIDATE_DIRS.join(", ")}）`);
}

async function walk(dir, results) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results);
    } else if (entry.isFile()) {
      const info = await stat(full);
      results.push({ path: full, bytes: info.size });
    }
  }
}

const targetDir = await findTargetDir();
const files = [];
await walk(targetDir, files);

const oversized = files.filter((f) => f.bytes > CLOUDFLARE_MAX_ASSET_BYTES);

console.log(`checked ${files.length} files under ${targetDir}`);

if (oversized.length > 0) {
  console.error(`\n✘ Cloudflare Workers Static Assetsの25MiB上限を超えるファイルがあります:`);
  for (const f of oversized) {
    console.error(`  ${(f.bytes / 1024 / 1024).toFixed(2)} MiB  ${f.path}`);
  }
  console.error(`\nscripts/chunk-large-assets.mjs で分割するか、CHUNK_TARGETSに追加してください。`);
  process.exit(1);
}

console.log("OK: 25MiBを超えるファイルはありません");
