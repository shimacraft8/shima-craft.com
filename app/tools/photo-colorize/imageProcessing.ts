/**
 * ブラウザ側の画像前処理。画像はブラウザのメモリ内でのみ扱い、
 * サーバーや外部サービスへは送信しない。
 * - EXIF orientation を反映（createImageBitmap の imageOrientation オプションを利用し、
 *   EXIFパーサーを自前実装しない）
 * - Canvas 再描画により EXIF（位置情報等）は結果へ引き継がれない
 * - 端末性能に応じて長辺を安全な範囲へ縮小
 * - カラー化モデル入力用の 256x256 縮小版も同時に作る
 */

import { MODELS } from "@/lib/colorization/browser/ortRuntime";

const STANDARD_SIZE = MODELS.siggraph17.inputSize; // 256
const HIGH_SIZE = MODELS.ddcolor.inputSize; // 512

/** 通常端末での処理上限（長辺px）。 */
export const MAX_DIMENSION = 2400;
/** メモリの少ない端末での処理上限（長辺px）。 */
export const MAX_DIMENSION_LOW_MEMORY = 1600;
/** これ未満の解像度は色にじみ警告を出す。 */
export const MIN_RECOMMENDED_DIMENSION = 300;

export type PreparedImage = {
  /** Before 表示・再合成対象の RGBA（EXIF反映・縮小済み）。 */
  fullRgba: Uint8ClampedArray;
  width: number;
  height: number;
  /** 標準モデル(siggraph17)入力用 256x256 の RGBA。 */
  smallRgba: Uint8ClampedArray;
  /** 高品質モデル(DDColor)入力用 512x512 の RGBA。 */
  largeRgba: Uint8ClampedArray;
  /** Before 表示用の object URL（不要になったら revokePreviewUrl で解放）。 */
  previewUrl: string;
  /** 元画像から縮小したかどうか（画面で明示するため）。 */
  resizedFrom: { width: number; height: number } | null;
  /** 元ファイルのバイト数（利用ログ用。ファイル名・内容は保持しない）。 */
  sourceFileSize: number;
  /** 低解像度警告など。 */
  warnings: string[];
};

export class ImageProcessingError extends Error {}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new ImageProcessingError("画像を読み込めませんでした。");
    }
  }
}

/** 端末のメモリ量に応じた処理上限を返す。 */
export function maxDimensionForDevice(nav: { deviceMemory?: number } = navigator as { deviceMemory?: number }): number {
  const mem = nav.deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem <= 4) return MAX_DIMENSION_LOW_MEMORY;
  return MAX_DIMENSION;
}

export function computeTargetSize(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number; resized: boolean } {
  const longSide = Math.max(width, height);
  if (longSide <= maxDimension) return { width, height, resized: false };
  const scale = maxDimension / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/** ファイルを検証・縮小し、カラー化処理に必要なピクセルデータ一式を返す。 */
export async function prepareImageForColorize(file: File): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  const orig = { width: bitmap.width, height: bitmap.height };
  const target = computeTargetSize(orig.width, orig.height, maxDimensionForDevice());

  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new ImageProcessingError("画像の処理に対応していないブラウザです。");
  }

  // 透過画像は白背景へ合成する
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(bitmap, 0, 0, target.width, target.height);

  const fullData = ctx.getImageData(0, 0, target.width, target.height);

  // モデル入力用の縮小版を2種類作る（256=標準 / 512=高品質）。
  const drawSquare = (size: number): Uint8ClampedArray => {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const cx = c.getContext("2d");
    if (!cx) {
      bitmap.close();
      throw new ImageProcessingError("画像の処理に対応していないブラウザです。");
    }
    cx.fillStyle = "#ffffff";
    cx.fillRect(0, 0, size, size);
    cx.drawImage(bitmap, 0, 0, size, size);
    return cx.getImageData(0, 0, size, size).data;
  };
  const smallData = drawSquare(STANDARD_SIZE);
  const largeData = drawSquare(HIGH_SIZE);
  bitmap.close();

  const blob = await canvasToBlob(canvas, 0.92);
  if (!blob) throw new ImageProcessingError("画像の変換に失敗しました。");

  const warnings: string[] = [];
  if (Math.min(target.width, target.height) < MIN_RECOMMENDED_DIMENSION) {
    warnings.push("low_resolution");
  }

  return {
    fullRgba: fullData.data,
    width: target.width,
    height: target.height,
    smallRgba: smallData,
    largeRgba: largeData,
    previewUrl: URL.createObjectURL(blob),
    resizedFrom: target.resized ? orig : null,
    sourceFileSize: file.size,
    warnings,
  };
}

export function revokePreviewUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}

/** ダウンロード用の安全なファイル名を組み立てる（元のファイル名は使用しない）。 */
export function buildDownloadFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `shimacraft-colorized-${stamp}.jpg`;
}
