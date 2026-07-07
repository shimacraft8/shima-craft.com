import { describe, expect, it } from "vitest";
import { claheRgba, stretchLevels } from "../clahe";

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

describe("stretchLevels", () => {
  it("圧縮された輝度レンジをフルレンジへ伸長する", () => {
    // [60, 180] の狭いレンジ → 伸長後は 0 付近〜255 付近へ広がる
    const N = 64;
    const rgba = makeGrayRgba(N, N, (i) => 60 + (i % 121));
    const out = stretchLevels(rgba, N, N);
    let minV = 255, maxV = 0;
    for (let i = 0; i < N * N; i++) {
      minV = Math.min(minV, out[i * 4]);
      maxV = Math.max(maxV, out[i * 4]);
    }
    expect(minV).toBeLessThan(15);
    expect(maxV).toBeGreaterThan(240);
  });

  it("フルレンジの画像は no-op（同一バッファを返す）", () => {
    const N = 64;
    const rgba = makeGrayRgba(N, N, (i) => i % 256);
    const out = stretchLevels(rgba, N, N);
    expect(out).toBe(rgba);
  });

  it("ほぼ均一な画像は増幅しない（ノイズ爆発防止）", () => {
    const N = 32;
    const rgba = makeGrayRgba(N, N, (i) => 128 + (i % 10));
    const out = stretchLevels(rgba, N, N);
    expect(out).toBe(rgba);
  });

  it("alpha を保持し R=G=B を維持する", () => {
    const N = 32;
    const rgba = makeGrayRgba(N, N, (i) => 80 + (i % 100));
    for (let i = 0; i < N * N; i++) rgba[i * 4 + 3] = 200;
    const out = stretchLevels(rgba, N, N);
    for (let i = 0; i < N * N; i++) {
      expect(out[i * 4 + 3]).toBe(200);
      expect(out[i * 4]).toBe(out[i * 4 + 1]);
      expect(out[i * 4 + 1]).toBe(out[i * 4 + 2]);
    }
  });

  it("単調性を保つ（明暗の順序が入れ替わらない）", () => {
    const N = 32;
    const rgba = makeGrayRgba(N, N, (i) => 50 + (i % 150));
    const out = stretchLevels(rgba, N, N);
    // 元の輝度が大きいほど出力も大きい（LUT の単調性）
    const pairs = [];
    for (let i = 0; i < N * N; i++) pairs.push([rgba[i * 4], out[i * 4]]);
    pairs.sort((x, y) => x[0] - y[0]);
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i][1]).toBeGreaterThanOrEqual(pairs[i - 1][1]);
    }
  });

  it("0 画素でもクラッシュしない", () => {
    const rgba = new Uint8ClampedArray(0);
    expect(() => stretchLevels(rgba, 0, 0)).not.toThrow();
  });
});
