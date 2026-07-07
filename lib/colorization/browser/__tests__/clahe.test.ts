import { describe, expect, it } from "vitest";
import { claheRgba } from "../clahe";

function makeGrayRgba(width: number, height: number, fillFn: (i: number) => number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = fillFn(i);
    buf[i * 4] = v;
    buf[i * 4 + 1] = v;
    buf[i * 4 + 2] = v;
    buf[i * 4 + 3] = 255;
  }
  return buf;
}

describe("claheRgba", () => {
  it("出力サイズが入力と一致する", () => {
    const rgba = makeGrayRgba(64, 64, () => 128);
    const out = claheRgba(rgba, 64, 64);
    expect(out.length).toBe(rgba.length);
  });

  it("alpha チャンネルを保持する", () => {
    const rgba = makeGrayRgba(32, 32, () => 100);
    // alpha を 200 に設定
    for (let i = 0; i < 32 * 32; i++) rgba[i * 4 + 3] = 200;
    const out = claheRgba(rgba, 32, 32);
    for (let i = 0; i < 32 * 32; i++) {
      expect(out[i * 4 + 3]).toBe(200);
    }
  });

  it("均一輝度の画像はほぼ変化しない（クリッピング後も均一）", () => {
    const rgba = makeGrayRgba(64, 64, () => 128);
    const out = claheRgba(rgba, 64, 64);
    for (let i = 0; i < 64 * 64; i++) {
      expect(out[i * 4]).toBeGreaterThanOrEqual(0);
      expect(out[i * 4]).toBeLessThanOrEqual(255);
    }
  });

  it("低コントラスト画像（暗め）のコントラストを拡張する", () => {
    // [100, 120] の狭い範囲の輝度 → 均一化後は範囲が広がるはず
    const N = 64;
    const rgba = makeGrayRgba(N, N, (i) => 100 + (i % 20));
    const out = claheRgba(rgba, N, N, 32, 2.0);
    let minV = 255, maxV = 0;
    for (let i = 0; i < N * N; i++) {
      minV = Math.min(minV, out[i * 4]);
      maxV = Math.max(maxV, out[i * 4]);
    }
    // 均一化後の輝度レンジが元より広くなる（入力レンジ20 → 出力レンジが広がる）
    expect(maxV - minV).toBeGreaterThan(20);
  });

  it("出力値は常に [0, 255] の範囲内", () => {
    const rgba = makeGrayRgba(128, 128, (i) => i % 256);
    const out = claheRgba(rgba, 128, 128);
    for (let i = 0; i < 128 * 128; i++) {
      expect(out[i * 4]).toBeGreaterThanOrEqual(0);
      expect(out[i * 4]).toBeLessThanOrEqual(255);
    }
  });

  it("R=G=B を保持する（グレースケール出力）", () => {
    const rgba = makeGrayRgba(32, 32, (i) => (i * 7) % 200 + 28);
    const out = claheRgba(rgba, 32, 32);
    for (let i = 0; i < 32 * 32; i++) {
      expect(out[i * 4]).toBe(out[i * 4 + 1]);
      expect(out[i * 4 + 1]).toBe(out[i * 4 + 2]);
    }
  });

  it("1×1 の画像でもクラッシュしない", () => {
    const rgba = makeGrayRgba(1, 1, () => 128);
    const out = claheRgba(rgba, 1, 1, 32, 2.0);
    expect(out.length).toBe(4);
    expect(out[3]).toBe(255);
  });

  it("カスタムタイルサイズでも動作する", () => {
    const rgba = makeGrayRgba(256, 256, (i) => i % 256);
    const out = claheRgba(rgba, 256, 256, 64, 3.0);
    expect(out.length).toBe(256 * 256 * 4);
    for (let i = 0; i < 256 * 256; i++) {
      expect(out[i * 4]).toBeGreaterThanOrEqual(0);
      expect(out[i * 4]).toBeLessThanOrEqual(255);
    }
  });
});
