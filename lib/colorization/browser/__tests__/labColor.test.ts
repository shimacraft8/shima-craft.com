import { describe, expect, it } from "vitest";
import { labToRgba, linearToSrgb, rgbaToL, srgbToLinear } from "../labColor";

function rgba(...pixels: Array<[number, number, number]>): Uint8ClampedArray {
  const arr = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    arr[i * 4] = r;
    arr[i * 4 + 1] = g;
    arr[i * 4 + 2] = b;
    arr[i * 4 + 3] = 255;
  });
  return arr;
}

describe("srgbToLinear / linearToSrgb", () => {
  it("往復変換が恒等になる", () => {
    for (const v of [0, 0.04, 0.2, 0.5, 0.8, 1]) {
      expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 6);
    }
  });
});

describe("rgbaToL", () => {
  it("白は L=100、黒は L=0", () => {
    const L = rgbaToL(rgba([255, 255, 255], [0, 0, 0]), 2);
    expect(L[0]).toBeCloseTo(100, 0);
    expect(L[1]).toBeCloseTo(0, 0);
  });

  it("中間グレー(119,119,119)は L≈50 (skimage rgb2lab と一致)", () => {
    const L = rgbaToL(rgba([119, 119, 119]), 1);
    expect(L[0]).toBeGreaterThan(48);
    expect(L[0]).toBeLessThan(52);
  });
});

describe("labToRgba", () => {
  it("ab=0 ならグレースケールになり、元の輝度を保持する", () => {
    const src = rgba([200, 200, 200], [50, 50, 50]);
    const L = rgbaToL(src, 2);
    const out = new Uint8ClampedArray(8);
    labToRgba(L, new Float32Array(2), new Float32Array(2), out, 2);
    // R=G=B（グレー）で、元とほぼ同じ値
    for (let i = 0; i < 2; i++) {
      expect(out[i * 4]).toBe(out[i * 4 + 1]);
      expect(out[i * 4 + 1]).toBe(out[i * 4 + 2]);
      expect(Math.abs(out[i * 4] - src[i * 4])).toBeLessThanOrEqual(1);
    }
  });

  it("正の a で赤みが乗り、輝度(L)は変わらない", () => {
    const src = rgba([128, 128, 128]);
    const L = rgbaToL(src, 1);
    const out = new Uint8ClampedArray(4);
    labToRgba(L, new Float32Array([30]), new Float32Array([0]), out, 1);
    expect(out[0]).toBeGreaterThan(out[1]); // R > G
    const Lout = rgbaToL(out, 1);
    expect(Math.abs(Lout[0] - L[0])).toBeLessThan(1.5);
  });

  it("極端な ab でも RGB が 0..255 に収まる", () => {
    const L = new Float32Array([50]);
    const out = new Uint8ClampedArray(4);
    labToRgba(L, new Float32Array([500]), new Float32Array([-500]), out, 1);
    for (let i = 0; i < 3; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(0);
      expect(out[i]).toBeLessThanOrEqual(255);
    }
  });
});
