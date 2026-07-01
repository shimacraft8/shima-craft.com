import { imageSize } from "image-size";
import type { SupportedImageType } from "@/lib/colorization/types";

/** マジックバイト（signature）から実際の画像形式を判定する。Content-Type ヘッダーは偽装できるため信頼しない。 */
export function detectImageType(buffer: Buffer): SupportedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ImageDimensions = { width: number; height: number };

/** 画像を実際にデコードして寸法を取得する。壊れた画像や偽装ファイルは例外を投げる。 */
export function decodeImageDimensions(buffer: Buffer): ImageDimensions | null {
  try {
    const result = imageSize(buffer);
    if (!result.width || !result.height) return null;
    return { width: result.width, height: result.height };
  } catch {
    return null;
  }
}

export const MIN_IMAGE_DIMENSION = 256;
