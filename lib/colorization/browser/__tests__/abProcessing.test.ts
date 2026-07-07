import { describe, expect, it } from "vitest";
import { boostChroma, clampChroma, grayStructureMAD, meanChroma, upsampleAb } from "../abProcessing";

describe("upsampleAb", () => {
  it("同一サイズなら値を保持する", () => {
    // 2x2 の a 平面 + 2x2 の b 平面
    const ab = new Float32Array([1, 2, 3, 4, 10, 20, 30, 40]);
    const { a, b } = upsampleAb(ab, 2, 2, 2);
    expect(Array.from(a)).toEqual([1, 2, 3, 4]);
    expect(Array.from(b)).toEqual([10, 20, 30, 40]);
  });

  it("拡大時は元の値の範囲内で補間される", () => {
    const ab = new Float32Array([0, 10, 20, 30, 0, 0, 0, 0]);
    const { a } = upsampleAb(ab, 2, 4, 4);
    expect(a.length).toBe(16);
    for (const v of Array.from(a)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(30);
    }
    // 四隅は元の値に一致（align_corners=false相当の中心サンプリング）
    expect(a[0]).toBeCloseTo(0, 5);
    expect(a[15]).toBeCloseTo(30, 5);
  });

  it("一様な平面は拡大後も一様", () => {
    const ab = new Float32Array(2 * 3 * 3).fill(7);
    const { a, b } = upsampleAb(ab, 3, 5, 7);
    for (const v of Array.from(a)) expect(v).toBeCloseTo(7, 5);
    for (const v of Array.from(b)) expect(v).toBeCloseTo(7, 5);
  });
});

describe("clampChroma", () => {
  it("上限以内の画素は変更しない", () => {
    const a = new Float32Array([30, -20]);
    const b = new Float32Array([30, 10]);
    const n = clampChroma(a, b, 2, 60);
    expect(n).toBe(0);
    expect(a[0]).toBe(30);
    expect(b[1]).toBe(10);
  });

  it("上限を超える画素は方向を保ったまま chroma=上限 に縮める", () => {
    const a = new Float32Array([80]);
    const b = new Float32Array([60]); // chroma = 100
    const n = clampChroma(a, b, 1, 60);
    expect(n).toBe(1);
    expect(Math.hypot(a[0], b[0])).toBeCloseTo(60, 4);
    expect(a[0] / b[0]).toBeCloseTo(80 / 60, 4); // 色相維持
  });
});

describe("boostChroma（あざやか仕上がり）", () => {
  it("低〜中彩度は約gain倍に増幅され、色相（a:b比）は保存される", () => {
    const a = new Float32Array([10]);
    const b = new Float32Array([20]);
    boostChroma(a, b, 1, 1.45, 42, 60);
    expect(Math.hypot(a[0], b[0])).toBeCloseTo(Math.hypot(10, 20) * 1.45, 3);
    expect(a[0] / b[0]).toBeCloseTo(10 / 20, 5);
  });

  it("増幅後もchromaが上限を超えない（ソフトニー圧縮）", () => {
    const a = new Float32Array([40, 55]);
    const b = new Float32Array([30, 20]); // chroma 50, 58.5
    boostChroma(a, b, 2, 1.45, 42, 60);
    for (let i = 0; i < 2; i++) {
      expect(Math.hypot(a[i], b[i])).toBeLessThanOrEqual(60);
    }
  });

  it("無彩色(ab=0)は変化しない（NaNを出さない）", () => {
    const a = new Float32Array([0]);
    const b = new Float32Array([0]);
    boostChroma(a, b, 1);
    expect(a[0]).toBe(0);
    expect(b[0]).toBe(0);
    expect(Number.isNaN(a[0])).toBe(false);
  });

  it("増幅は単調（元のchromaが大きいほど結果も大きい）", () => {
    const a = new Float32Array([10, 20, 35, 50]);
    const b = new Float32Array([0, 0, 0, 0]);
    boostChroma(a, b, 4, 1.45, 42, 60);
    for (let i = 1; i < 4; i++) {
      expect(a[i]).toBeGreaterThan(a[i - 1]);
    }
  });
});

describe("grayStructureMAD", () => {
  it("同一画像なら 0", () => {
    const L = new Float32Array([10, 50, 90]);
    expect(grayStructureMAD(L, L, 3)).toBe(0);
  });

  it("平均絶対差を返す", () => {
    const a = new Float32Array([0, 100]);
    const b = new Float32Array([10, 90]);
    expect(grayStructureMAD(a, b, 2)).toBeCloseTo(10, 5);
  });
});

describe("meanChroma", () => {
  it("すべて無彩色なら 0", () => {
    const a = new Float32Array([0, 0, 0]);
    const b = new Float32Array([0, 0, 0]);
    expect(meanChroma(a, b, 3)).toBe(0);
  });

  it("純粋な a 方向の chroma を返す", () => {
    const a = new Float32Array([3, 4]);
    const b = new Float32Array([4, 3]);
    // hypot(3,4) = 5, hypot(4,3) = 5 → mean = 5
    expect(meanChroma(a, b, 2)).toBeCloseTo(5, 5);
  });

  it("1 ピクセルのみ", () => {
    const a = new Float32Array([30]);
    const b = new Float32Array([40]);
    expect(meanChroma(a, b, 1)).toBeCloseTo(50, 5);
  });
});
