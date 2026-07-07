/**
 * コラージュ画像（1枚に複数写真が並んだ）の分割検出とタイル分割処理。
 * - 水平方向（上下並び）・垂直方向（左右並び）の余白帯（ほぼ白/黒の連続行・列）を検出する
 * - タイルを個別にカラー化してから位置を合わせて再合成する
 * - 分割が見つからなければ空配列を返す（通常処理へフォールバック）
 */

export type CollageAxis = "horizontal" | "vertical";

/** 分割線として使えるほぼ均一な明/暗帯の条件 */
const SEPARATOR_UNIFORM_RATIO = 0.9;
const SEPARATOR_BRIGHT = 230;
const SEPARATOR_DARK = 20;
const MAX_SPLITS = 2; // → 最大3タイル
const MIN_SEPARATOR_PX = 6; // 少なくとも6行/列が分割帯

function lumaAt(rgba: Uint8ClampedArray, index: number): number {
  const i = index * 4;
  // BT.601 luma
  return 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
}

/** 1行（y固定）が分割帯かどうか */
function isSeparatorRow(rgba: Uint8ClampedArray, y: number, width: number): boolean {
  let uniformCount = 0;
  for (let x = 0; x < width; x++) {
    const v = lumaAt(rgba, y * width + x);
    if (v > SEPARATOR_BRIGHT || v < SEPARATOR_DARK) uniformCount++;
  }
  return uniformCount / width > SEPARATOR_UNIFORM_RATIO;
}

/** 1列（x固定）が分割帯かどうか */
function isSeparatorColumn(rgba: Uint8ClampedArray, x: number, width: number, height: number): boolean {
  let uniformCount = 0;
  for (let y = 0; y < height; y++) {
    const v = lumaAt(rgba, y * width + x);
    if (v > SEPARATOR_BRIGHT || v < SEPARATOR_DARK) uniformCount++;
  }
  return uniformCount / height > SEPARATOR_UNIFORM_RATIO;
}

/** separator フラグ列から連続帯の中央座標を集める（共通ロジック） */
function collectSplits(sep: boolean[], size: number): number[] {
  const splits: number[] = [];
  let runStart = -1;
  for (let i = 0; i <= size; i++) {
    const active = i < size && sep[i];
    if (active && runStart === -1) {
      runStart = i;
    } else if (!active && runStart !== -1) {
      const runLen = i - runStart;
      if (runLen >= MIN_SEPARATOR_PX) {
        splits.push(runStart + Math.round(runLen / 2));
      }
      runStart = -1;
    }
    if (splits.length >= MAX_SPLITS) break;
  }
  // 端の 10% は分割対象から除外
  return splits.filter((v) => v > size * 0.1 && v < size * 0.9);
}

/** 水平分割ライン（y 座標）を検出する。上下に並んだコラージュ用。 */
export function detectHorizontalSplits(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const sep: boolean[] = new Array(height);
  for (let y = 0; y < height; y++) {
    sep[y] = isSeparatorRow(rgba, y, width);
  }
  return collectSplits(sep, height);
}

/** 垂直分割ライン（x 座標）を検出する。左右に並んだコラージュ用。 */
export function detectVerticalSplits(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  const sep: boolean[] = new Array(width);
  for (let x = 0; x < width; x++) {
    sep[x] = isSeparatorColumn(rgba, x, width, height);
  }
  return collectSplits(sep, width);
}

/**
 * RGBA を純粋 JS でバイリニアリサイズする（DOM 不要、ブラウザ推論内で使用）。
 * @param src 元 RGBA
 * @param srcW 元の幅
 * @param cropX クロップ開始 x（cropX+cropW <= srcW）
 * @param cropY クロップ開始 y
 * @param cropW クロップ幅
 * @param cropH クロップ高さ
 * @param dstW 出力幅
 * @param dstH 出力高さ
 */
export function cropResizeRgba(
  src: Uint8ClampedArray,
  srcW: number,
  cropX: number,
  cropY: number,
  cropW: number,
  cropH: number,
  dstW: number,
  dstH: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const scaleX = cropW / dstW;
  const scaleY = cropH / dstH;
  for (let dy = 0; dy < dstH; dy++) {
    const sy = Math.min(cropH - 1, Math.max(0, (dy + 0.5) * scaleY - 0.5)) + cropY;
    const sy0 = Math.min(Math.floor(sy), cropY + cropH - 1);
    const sy1 = Math.min(sy0 + 1, cropY + cropH - 1);
    const wy = sy - Math.floor(sy);
    for (let dx = 0; dx < dstW; dx++) {
      const sx = Math.min(cropW - 1, Math.max(0, (dx + 0.5) * scaleX - 0.5)) + cropX;
      const sx0 = Math.min(Math.floor(sx), cropX + cropW - 1);
      const sx1 = Math.min(sx0 + 1, cropX + cropW - 1);
      const wx = sx - Math.floor(sx);
      const i00 = (sy0 * srcW + sx0) * 4;
      const i01 = (sy0 * srcW + sx1) * 4;
      const i10 = (sy1 * srcW + sx0) * 4;
      const i11 = (sy1 * srcW + sx1) * 4;
      const o = (dy * dstW + dx) * 4;
      for (let c = 0; c < 4; c++) {
        dst[o + c] = Math.round(
          src[i00 + c] * (1 - wy) * (1 - wx) +
          src[i01 + c] * (1 - wy) * wx +
          src[i10 + c] * wy * (1 - wx) +
          src[i11 + c] * wy * wx
        );
      }
    }
  }
  return dst;
}

export type CollageTile = {
  fullRgba: Uint8ClampedArray;
  smallRgba: Uint8ClampedArray;
  largeRgba: Uint8ClampedArray;
  width: number;
  height: number;
  startX: number;
  startY: number;
};

/**
 * タイルの ColorizeInput を splits から生成する。
 * @param fullRgba 元画像全体の RGBA
 * @param width 元画像幅
 * @param height 元画像高さ
 * @param splits 分割座標（昇順。axis=horizontal なら y、vertical なら x）
 * @param standardSize siggraph17 入力サイズ（256）
 * @param highSize DDColor 入力サイズ（512）
 * @param axis 分割方向（デフォルト horizontal = 上下に並んだコラージュ）
 */
export function splitIntoTiles(
  fullRgba: Uint8ClampedArray,
  width: number,
  height: number,
  splits: number[],
  standardSize: number,
  highSize: number,
  axis: CollageAxis = "horizontal"
): CollageTile[] {
  const limit = axis === "horizontal" ? height : width;
  const edges = [0, ...splits, limit];
  const tiles: CollageTile[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const start = edges[i];
    const end = edges[i + 1];
    const span = end - start;
    if (span < 4) continue; // 小さすぎるタイルは無視
    const cropX = axis === "horizontal" ? 0 : start;
    const cropY = axis === "horizontal" ? start : 0;
    const tileW = axis === "horizontal" ? width : span;
    const tileH = axis === "horizontal" ? span : height;
    const tileFull = cropResizeRgba(fullRgba, width, cropX, cropY, tileW, tileH, tileW, tileH);
    const tileSmall = cropResizeRgba(fullRgba, width, cropX, cropY, tileW, tileH, standardSize, standardSize);
    const tileLarge = cropResizeRgba(fullRgba, width, cropX, cropY, tileW, tileH, highSize, highSize);
    tiles.push({
      fullRgba: tileFull,
      smallRgba: tileSmall,
      largeRgba: tileLarge,
      width: tileW,
      height: tileH,
      startX: cropX,
      startY: cropY,
    });
  }
  return tiles;
}

/**
 * タイルの ab チャンネルを元画像内の位置（startX, startY）に合わせて結合する。
 * 水平・垂直どちらの分割にも対応する。
 */
export function stitchAbChannels(
  tiles: { a: Float32Array; b: Float32Array; width: number; height: number; startX: number; startY: number }[],
  totalWidth: number,
  totalHeight: number
): { a: Float32Array; b: Float32Array } {
  const a = new Float32Array(totalWidth * totalHeight);
  const b = new Float32Array(totalWidth * totalHeight);
  for (const tile of tiles) {
    for (let y = 0; y < tile.height; y++) {
      const src = y * tile.width;
      const dst = (tile.startY + y) * totalWidth + tile.startX;
      a.set(tile.a.subarray(src, src + tile.width), dst);
      b.set(tile.b.subarray(src, src + tile.width), dst);
    }
  }
  return { a, b };
}
