/**
 * コラージュ画像（1枚に複数写真が並んだ）の分割検出とタイル分割処理。
 * - 水平方向の余白帯（ほぼ白/黒の連続行）を検出し、タイルに分割する
 * - タイルを個別にカラー化してから再合成する
 * - 分割が見つからなければ空配列を返す（通常処理へフォールバック）
 */

/** 輝度配列をグレースケール(0-255)に変換（fullRgba から抽出済みの L(0-100) を使わず、RGBAから直接計算） */
function rowLuma(rgba: Uint8ClampedArray, y: number, width: number): Float32Array {
  const row = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    // BT.601 luma
    row[x] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return row;
}

/** 1行が「分割線として使えるほぼ均一な明/暗帯」かどうか */
function isSeparatorRow(row: Float32Array, width: number): boolean {
  let uniformCount = 0;
  for (let x = 0; x < width; x++) {
    if (row[x] > 230 || row[x] < 20) uniformCount++;
  }
  return uniformCount / width > 0.90;
}

/** 水平分割ライン(y座標, 上側タイルの最終行+1)を検出する。最大 MAX_SPLITS 個。 */
const MAX_SPLITS = 2; // → 最大3タイル
const MIN_SEPARATOR_PX = 6; // 少なくとも6行が分割帯

export function detectHorizontalSplits(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): number[] {
  // 行ごとに separator かどうか判定
  const sep: boolean[] = new Array(height).fill(false);
  for (let y = 0; y < height; y++) {
    sep[y] = isSeparatorRow(rowLuma(rgba, y, width), width);
  }

  // 連続 separator 帯のうち MIN_SEPARATOR_PX 以上のものを集め、中央 y を返す
  const splits: number[] = [];
  let runStart = -1;
  for (let y = 0; y <= height; y++) {
    const active = y < height && sep[y];
    if (active && runStart === -1) {
      runStart = y;
    } else if (!active && runStart !== -1) {
      const runLen = y - runStart;
      if (runLen >= MIN_SEPARATOR_PX) {
        splits.push(runStart + Math.round(runLen / 2));
      }
      runStart = -1;
    }
    if (splits.length >= MAX_SPLITS) break;
  }

  // 画像全体の高さの 10-90% 範囲内の分割のみ使う（端を除外）
  return splits.filter((y) => y > height * 0.1 && y < height * 0.9);
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

/**
 * タイルの ColorizeInput を splits から生成する。
 * @param fullRgba 元画像全体の RGBA
 * @param width 元画像幅
 * @param splits 水平分割 y 座標（昇順）
 * @param standardSize siggraph17 入力サイズ（256）
 * @param highSize DDColor 入力サイズ（512）
 */
export type CollageTile = {
  fullRgba: Uint8ClampedArray;
  smallRgba: Uint8ClampedArray;
  largeRgba: Uint8ClampedArray;
  width: number;
  height: number;
  startY: number;
};

export function splitIntoTiles(
  fullRgba: Uint8ClampedArray,
  width: number,
  height: number,
  splits: number[],
  standardSize: number,
  highSize: number
): CollageTile[] {
  const ys = [0, ...splits, height];
  const tiles: CollageTile[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const startY = ys[i];
    const endY = ys[i + 1];
    const tileH = endY - startY;
    if (tileH < 4) continue; // 小さすぎるタイルは無視
    const tileFull = cropResizeRgba(fullRgba, width, 0, startY, width, tileH, width, tileH);
    const tileSmall = cropResizeRgba(fullRgba, width, 0, startY, width, tileH, standardSize, standardSize);
    const tileLarge = cropResizeRgba(fullRgba, width, 0, startY, width, tileH, highSize, highSize);
    tiles.push({ fullRgba: tileFull, smallRgba: tileSmall, largeRgba: tileLarge, width, height: tileH, startY });
  }
  return tiles;
}

/**
 * タイルの ab チャンネルを元画像の位置に合わせて結合する。
 * @param tiles 各タイルの結果 (a, b Float32Array と width/height)
 * @param totalWidth 全体幅
 * @param totalHeight 全体高さ
 */
export function stitchAbChannels(
  tiles: { a: Float32Array; b: Float32Array; width: number; height: number }[],
  totalWidth: number,
  totalHeight: number
): { a: Float32Array; b: Float32Array } {
  const a = new Float32Array(totalWidth * totalHeight);
  const b = new Float32Array(totalWidth * totalHeight);
  let dstY = 0;
  for (const tile of tiles) {
    for (let y = 0; y < tile.height; y++) {
      const src = y * tile.width;
      const dst = (dstY + y) * totalWidth;
      a.set(tile.a.subarray(src, src + tile.width), dst);
      b.set(tile.b.subarray(src, src + tile.width), dst);
    }
    dstY += tile.height;
  }
  return { a, b };
}
