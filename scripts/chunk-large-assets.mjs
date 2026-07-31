#!/usr/bin/env node
/**
 * public/ 配下の大容量ファイル（Cloudflare Workers Static Assetsの25MiB上限を超えるもの）を
 * 24MiB以下のパートに分割し、各パート・元ファイル全体のSHA-256を記録したマニフェストを生成する。
 *
 * 実行: node scripts/chunk-large-assets.mjs
 * 出力:
 *   - 対象ファイルと同じディレクトリに {basename}.partN ファイル
 *   - public/large-assets.manifest.json（ブラウザ側の取得・検証・結合が読むマニフェスト）
 * 副作用: 分割後、パートを結合して元ファイル（もしくは再結合対象の既存パート群）と
 *         バイト完全一致することを確認したうえで、元のファイルを削除する
 *         （25MiBを超えるファイルをpublic/に残さないため）。
 *
 * 2種類の対象を扱う:
 *  - SINGLE_FILE_TARGETS: 単一の大容量ファイルをそのまま分割する
 *  - EXISTING_PARTS_TARGETS: 既に分割済みだが各パートが25MiBを超えている場合
 *    （例: GitHubの100MB上限向けに90MB単位で分割済みのddcolorモデル）。
 *    まず既存パートを結合して元ファイルを復元し、それを24MiB以下へ再分割する。
 */
import { createHash } from "node:crypto";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

// Cloudflare Workers Static Assetsの25MiB上限に安全マージンを持たせる。
const MAX_CHUNK_BYTES = 24 * 1024 * 1024;

const SINGLE_FILE_TARGETS = [
  "public/models/siggraph17_fp16.onnx",
  "public/models/siggraph17_int8.onnx",
  "public/ort/ort-wasm-simd-threaded.jsep.wasm",
];

/** 既に分割済みだがパート自体が25MiB超のもの。GitHub向け(90MB単位)のddcolorモデル。 */
const EXISTING_PARTS_TARGETS = [
  {
    // 新しい論理パス（マニフェストのキー・ortRuntime.tsが参照する名前）
    logicalPath: "public/models/ddcolor_webgpu.onnx",
    existingParts: [
      "public/models/ddcolor_webgpu.onnx.part0",
      "public/models/ddcolor_webgpu.onnx.part1",
      "public/models/ddcolor_webgpu.onnx.part2",
    ],
  },
  {
    logicalPath: "public/models/ddcolor_wasm.onnx",
    existingParts: ["public/models/ddcolor_wasm.onnx.part0", "public/models/ddcolor_wasm.onnx.part1"],
  },
];

/** "public/models/x.onnx" -> "/models/x.onnx"（ブラウザ側が使うサイト相対パスと一致させる）。 */
function toSiteRelativePath(relPath) {
  return relPath.replace(/^public/, "");
}

function sha256Hex(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/** wholeBufを24MiB以下のパートへ書き出し、結合して完全一致することを確認する。 */
async function writeChunksAndVerify(wholeBuf, dir, base) {
  const totalBytes = wholeBuf.byteLength;
  const totalSha256 = sha256Hex(wholeBuf);

  const parts = [];
  let offset = 0;
  let index = 0;
  while (offset < totalBytes) {
    const end = Math.min(offset + MAX_CHUNK_BYTES, totalBytes);
    const chunk = wholeBuf.subarray(offset, end);
    const partName = `${base}.part${index}`;
    await writeFile(join(dir, partName), chunk);
    parts.push({ name: partName, bytes: chunk.byteLength, sha256: sha256Hex(chunk) });
    offset = end;
    index += 1;
  }

  const rebuilt = Buffer.concat(await Promise.all(parts.map((p) => readFile(join(dir, p.name)))));
  if (rebuilt.byteLength !== totalBytes || sha256Hex(rebuilt) !== totalSha256) {
    throw new Error(`chunk verification failed for ${base}: rebuilt file does not match original`);
  }

  return { totalBytes, sha256: totalSha256, parts };
}

async function chunkSingleFile(relPath) {
  const absPath = resolve(root, relPath);
  const dir = dirname(absPath);
  const base = relPath.split("/").pop();

  const wholeBuf = await readFile(absPath);
  const entry = await writeChunksAndVerify(wholeBuf, dir, base);
  await rm(absPath);
  return { path: toSiteRelativePath(relPath), ...entry };
}

async function rechunkExistingParts(logicalPath, existingPartRelPaths) {
  const absPaths = existingPartRelPaths.map((p) => resolve(root, p));
  const dir = dirname(resolve(root, logicalPath));
  const base = logicalPath.split("/").pop();

  // 先に旧パートを全てメモリへ読み切ってから削除する。新パートのファイル名
  // （{base}.part0, .part1, ...）が旧パートの一部と衝突しうるため（例:
  // ddcolor_webgpu.onnx.part0 は旧パートにも新パートにも存在する）、
  // 新パートを書き込む前に旧パートを消しておかないと、書き込み直後に
  // 「たまたま同名だった新パート」を誤って削除してしまう。
  const wholeBuf = Buffer.concat(await Promise.all(absPaths.map((p) => readFile(p))));
  await Promise.all(absPaths.map((p) => rm(p)));
  const entry = await writeChunksAndVerify(wholeBuf, dir, base);
  return { path: toSiteRelativePath(logicalPath), ...entry };
}

const manifestPath = resolve(root, "public/large-assets.manifest.json");
const manifest = await readFile(manifestPath, "utf8")
  .then(JSON.parse)
  .catch(() => ({ version: 1, maxChunkBytes: MAX_CHUNK_BYTES, files: {} }));
manifest.maxChunkBytes = MAX_CHUNK_BYTES;

for (const target of SINGLE_FILE_TARGETS) {
  const before = await stat(resolve(root, target)).catch(() => null);
  if (!before) {
    console.log(`skip (not found, already chunked?): ${target}`);
    continue;
  }
  process.stdout.write(`chunking ${target} (${before.size} bytes) ... `);
  const entry = await chunkSingleFile(target);
  manifest.files[toSiteRelativePath(target)] = entry;
  console.log(`${entry.parts.length} parts, verified OK, original removed`);
}

for (const { logicalPath, existingParts } of EXISTING_PARTS_TARGETS) {
  const firstPartStat = await stat(resolve(root, existingParts[0])).catch(() => null);
  if (!firstPartStat) {
    console.log(`skip (not found, already re-chunked?): ${logicalPath}`);
    continue;
  }
  process.stdout.write(`re-chunking ${logicalPath} from ${existingParts.length} oversized parts ... `);
  const entry = await rechunkExistingParts(logicalPath, existingParts);
  manifest.files[toSiteRelativePath(logicalPath)] = entry;
  console.log(`${entry.parts.length} parts (was ${existingParts.length}), verified OK, old parts removed`);
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifest written to ${manifestPath}`);
