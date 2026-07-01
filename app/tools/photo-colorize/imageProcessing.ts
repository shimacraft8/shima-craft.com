/**
 * ブラウザ側の画像前処理。
 * - EXIF orientation を反映（createImageBitmap の imageOrientation オプションを利用し、
 *   EXIFパーサーを自前実装しない）
 * - 長辺 MAX_DIMENSION 以内にリサイズ
 * - 透過は白背景へ合成
 * - JPEG品質を段階的に下げながら TARGET_MAX_BYTES 未満に収める
 */

export const MAX_DIMENSION = 3000;
export const TARGET_MAX_BYTES = 4_000_000;
const QUALITY_STEPS = [0.92, 0.88, 0.82, 0.75, 0.65, 0.55] as const;

export type PreparedImage = {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
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

function computeTargetSize(width: number, height: number): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= MAX_DIMENSION) return { width, height };
  const scale = MAX_DIMENSION / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/** ファイルを検証・縮小・圧縮し、アップロード用Blobとプレビュー用object URLを返す。 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const bitmap = await loadBitmap(file);
  const { width, height } = computeTargetSize(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError("画像の処理に対応していないブラウザです。");

  // 透過画像は白背景へ合成する
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size < TARGET_MAX_BYTES) break;
  }

  if (!blob) throw new ImageProcessingError("画像の変換に失敗しました。");

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
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
