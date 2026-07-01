import { describe, expect, it } from "vitest";
import { detectImageType, decodeImageDimensions, MIN_IMAGE_DIMENSION } from "../validateImage";

// 1x1 の実画像バイナリ（各フォーマットの最小構成）
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
// 8x8 の最小JPEG
const JPEG_8X8 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIAAgBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AKAA/9k=",
  "base64"
);
// RIFF/WEBP ヘッダーのみ（VP8 チャンクは省略。デコード不可の想定で使う）
const WEBP_HEADER_ONLY = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
]);

describe("detectImageType", () => {
  it("JPEGのマジックバイトを検出する", () => {
    expect(detectImageType(JPEG_8X8)).toBe("image/jpeg");
  });

  it("PNGのマジックバイトを検出する", () => {
    expect(detectImageType(PNG_1X1)).toBe("image/png");
  });

  it("WebP(RIFF/WEBP)のマジックバイトを検出する", () => {
    expect(detectImageType(WEBP_HEADER_ONLY)).toBe("image/webp");
  });

  it("拡張子やContent-Typeを偽装したテキストファイルは拒否する", () => {
    const fakeImage = Buffer.from("<script>alert(1)</script>", "utf-8");
    expect(detectImageType(fakeImage)).toBeNull();
  });

  it("GIFのマジックバイトは対応外として拒否する", () => {
    const gif = Buffer.from("GIF89a", "ascii");
    expect(detectImageType(gif)).toBeNull();
  });

  it("空バッファは拒否する", () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});

describe("decodeImageDimensions", () => {
  it("有効なPNGの寸法をデコードする", () => {
    const dims = decodeImageDimensions(PNG_1X1);
    expect(dims).toEqual({ width: 1, height: 1 });
  });

  it("有効なJPEGの寸法をデコードする", () => {
    const dims = decodeImageDimensions(JPEG_8X8);
    expect(dims).toEqual({ width: 8, height: 8 });
  });

  it("壊れた/不完全な画像はnullを返す(デコード確認)", () => {
    expect(decodeImageDimensions(WEBP_HEADER_ONLY)).toBeNull();
  });

  it("MIN_IMAGE_DIMENSIONは256である", () => {
    expect(MIN_IMAGE_DIMENSION).toBe(256);
  });
});
