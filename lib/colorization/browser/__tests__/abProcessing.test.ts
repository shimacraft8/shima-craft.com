import { describe, expect, it } from "vitest";
import { boostChroma, clampChroma, equalizeAbAxes, grayStructureMAD, hueConcentration, luminancePercentile, meanChroma, normalizeChroma, protectHighlights, protectShadows, removeCast, removeCastAdaptive, upsampleAb } from "../abProcessing";

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

describe("hueConcentration", () => {
  it("全画素が同一色相なら 1.0", () => {
    const a = new Float32Array([10, 20, 5]);
    const b = new Float32Array([10, 20, 5]); // すべて同方向 (1,1)
    expect(hueConcentration(a, b, 3)).toBeCloseTo(1.0, 5);
  });

  it("正反対の色相が同量なら 0 に近い", () => {
    const a = new Float32Array([10, -10]);
    const b = new Float32Array([5, -5]);
    expect(hueConcentration(a, b, 2)).toBeCloseTo(0, 5);
  });

  it("全画素が無彩色なら 0", () => {
    const a = new Float32Array([0, 0]);
    const b = new Float32Array([0, 0]);
    expect(hueConcentration(a, b, 2)).toBe(0);
  });

  it("セピア一色（b>0 に偏り）は高い集中度を示す", () => {
    // 典型的なセピア失敗出力: aわずかに正、bが大きく正
    const n = 100;
    const a = new Float32Array(n);
    const b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      a[i] = 5 + (i % 3);
      b[i] = 15 + (i % 5);
    }
    expect(hueConcentration(a, b, n)).toBeGreaterThan(0.95);
  });

  it("多方向に分散した色は低い集中度を示す", () => {
    // 4方向に均等分散
    const a = new Float32Array([10, -10, 0, 0]);
    const b = new Float32Array([0, 0, 10, -10]);
    expect(hueConcentration(a, b, 4)).toBeLessThan(0.1);
  });
});

describe("removeCastAdaptive", () => {
  it("明部画素（L=90）は暗部画素より強く補正される", () => {
    const a = new Float32Array([10, 10, 10]);
    const b = new Float32Array([15, 15, 15]);
    const L = new Float32Array([10, 50, 90]);
    removeCastAdaptive(a, b, L, 3, 0.3, 0.85, 20, 80);
    // 明部(idx=2) が最も強く補正され残差が最小
    expect(Math.abs(a[2])).toBeLessThan(Math.abs(a[1]));
    expect(Math.abs(a[1])).toBeLessThan(Math.abs(a[0]));
  });

  it("全画素が同じ輝度なら均一な補正になる", () => {
    const a = new Float32Array([10, 10, 10]);
    const b = new Float32Array([5, 5, 5]);
    const L = new Float32Array([50, 50, 50]);
    removeCastAdaptive(a, b, L, 3);
    expect(a[0]).toBeCloseTo(a[1], 5);
    expect(a[1]).toBeCloseTo(a[2], 5);
  });

  it("L < shadowL では shadowStrength で補正される", () => {
    const mean = 10;
    const a = new Float32Array([mean, mean]);
    const b = new Float32Array([0, 0]);
    const L = new Float32Array([10, 10]);
    removeCastAdaptive(a, b, L, 2, 0.3, 0.85, 20, 80);
    expect(a[0]).toBeCloseTo(mean * 0.7, 4);
  });

  it("L > highlightL では highlightStrength で補正される", () => {
    const mean = 10;
    const a = new Float32Array([mean, mean]);
    const b = new Float32Array([0, 0]);
    const L = new Float32Array([90, 90]);
    removeCastAdaptive(a, b, L, 2, 0.3, 0.85, 20, 80);
    expect(a[0]).toBeCloseTo(mean * (1 - 0.85), 4);
  });

  it("ab=0 の画素は変化しない", () => {
    const a = new Float32Array([0, 0]);
    const b = new Float32Array([0, 0]);
    const L = new Float32Array([30, 80]);
    removeCastAdaptive(a, b, L, 2);
    expect(a[0]).toBeCloseTo(0, 5);
    expect(b[1]).toBeCloseTo(0, 5);
  });
});

describe("equalizeAbAxes", () => {
  /** 45°の暖色軸に沿った葉巻型分布を作る（長軸σ大・短軸σ小） */
  function makeCigar(n: number, majorSigma: number, minorSigma: number): { a: Float32Array; b: Float32Array } {
    const a = new Float32Array(n);
    const b = new Float32Array(n);
    const cos = Math.SQRT1_2;
    const sin = Math.SQRT1_2;
    for (let i = 0; i < n; i++) {
      // 決定論的な擬似分布: 長軸・短軸方向に交互配置
      const c1 = ((i % 7) - 3) / 3 * majorSigma * 1.5;
      const c2 = ((i % 5) - 2) / 2 * minorSigma * 1.5;
      a[i] = 10 + c1 * cos - c2 * sin;
      b[i] = 15 + c1 * sin + c2 * cos;
    }
    return { a, b };
  }

  function axisRatio(a: Float32Array, b: Float32Array, n: number): number {
    let ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - ma, db = b[i] - mb;
      sxx += da * da; syy += db * db; sxy += da * db;
    }
    sxx /= n; syy /= n; sxy /= n;
    const half = (sxx + syy) / 2;
    const diff = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
    return Math.sqrt(Math.max(0, half - diff)) / Math.sqrt(half + diff);
  }

  it("葉巻型分布の短軸を目標比まで増幅する（gain > 1）", () => {
    const { a, b } = makeCigar(1000, 10, 2); // ratio = 0.2
    const before = axisRatio(a, b, 1000);
    const gain = equalizeAbAxes(a, b, 1000, 0.5, 2.0);
    const after = axisRatio(a, b, 1000);
    expect(before).toBeLessThan(0.3);
    expect(gain).toBeGreaterThan(1);
    expect(after).toBeGreaterThan(before);
  });

  it("平均（分布の中心）は保存される", () => {
    const { a, b } = makeCigar(1000, 10, 2);
    equalizeAbAxes(a, b, 1000);
    let ma = 0, mb = 0;
    for (let i = 0; i < 1000; i++) { ma += a[i]; mb += b[i]; }
    expect(ma / 1000).toBeCloseTo(10, 0);
    expect(mb / 1000).toBeCloseTo(15, 0);
  });

  it("既に丸い分布には何もしない（gain=1）", () => {
    const { a, b } = makeCigar(1000, 8, 6); // ratio = 0.75 > 0.5
    const aCopy = a.slice(0);
    const gain = equalizeAbAxes(a, b, 1000, 0.5, 2.0);
    expect(gain).toBe(1);
    expect(a[0]).toBe(aCopy[0]);
  });

  it("短軸がノイズレベル（σ2 < 0.5）なら増幅しない", () => {
    const { a, b } = makeCigar(1000, 10, 0.1);
    const gain = equalizeAbAxes(a, b, 1000);
    expect(gain).toBe(1);
  });

  it("全体に分散がない（ほぼ一点）なら何もしない", () => {
    const a = new Float32Array(100).fill(12);
    const b = new Float32Array(100).fill(18);
    const gain = equalizeAbAxes(a, b, 100);
    expect(gain).toBe(1);
    expect(a[0]).toBe(12);
  });

  it("maxGain でキャップされる", () => {
    const { a, b } = makeCigar(1000, 20, 1); // 必要gain = 0.5*20/1 = 10 → cap 2.0
    const gain = equalizeAbAxes(a, b, 1000, 0.5, 2.0);
    expect(gain).toBeCloseTo(2.0, 5);
  });
});

describe("luminancePercentile", () => {
  it("一様分布の中央値は約50", () => {
    const n = 1000;
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = (i / n) * 100;
    const p50 = luminancePercentile(L, n, 0.5);
    expect(p50).toBeGreaterThan(45);
    expect(p50).toBeLessThan(55);
  });

  it("92パーセンタイルは上位側に位置する", () => {
    const n = 1000;
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = (i / n) * 100;
    const p92 = luminancePercentile(L, n, 0.92);
    expect(p92).toBeGreaterThan(88);
    expect(p92).toBeLessThan(96);
  });

  it("全画素が同じ値ならその値を返す", () => {
    const L = new Float32Array(100).fill(83);
    expect(luminancePercentile(L, 100, 0.92)).toBe(83);
  });

  it("明るい退色プリント（L が 60-95 に集中）では高い閾値になる", () => {
    const n = 1000;
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = 60 + (i / n) * 35;
    const p92 = luminancePercentile(L, n, 0.92);
    expect(p92).toBeGreaterThan(85);
  });
});

describe("normalizeChroma", () => {
  it("彩度不足の出力を目標へ増幅する（gain > 1）", () => {
    // mean chroma ≈ 5 → target 11 だが maxGain=1.8 でキャップ
    const a = new Float32Array([5, -5, 3]);
    const b = new Float32Array([0, 0, 4]);
    const gain = normalizeChroma(a, b, 3, 11, 1.8);
    expect(gain).toBeCloseTo(1.8, 5);
    expect(Math.abs(a[0])).toBeGreaterThan(5);
  });

  it("目標未満だがキャップ内なら target/mean の gain を適用", () => {
    const a = new Float32Array([8, 8]);
    const b = new Float32Array([0, 0]); // mean chroma = 8
    const gain = normalizeChroma(a, b, 2, 11, 1.8);
    expect(gain).toBeCloseTo(11 / 8, 4);
    expect(a[0]).toBeCloseTo(11, 3);
  });

  it("既に目標以上の出力には何もしない（gain=1）", () => {
    const a = new Float32Array([15, 15]);
    const b = new Float32Array([0, 0]);
    const aCopy = a.slice(0);
    const gain = normalizeChroma(a, b, 2, 11, 1.8);
    expect(gain).toBe(1);
    expect(a[0]).toBe(aCopy[0]);
  });

  it("ほぼ無彩色（失敗出力）には何もしない", () => {
    const a = new Float32Array([1, 1]);
    const b = new Float32Array([0.5, 0.5]);
    const gain = normalizeChroma(a, b, 2, 11, 1.8);
    expect(gain).toBe(1);
    expect(a[0]).toBe(1);
  });

  it("色相（a:b 比）は保存される", () => {
    const a = new Float32Array([6]);
    const b = new Float32Array([3]);
    normalizeChroma(a, b, 1, 11, 1.8);
    expect(a[0] / b[0]).toBeCloseTo(2, 4);
  });
});

describe("protectShadows", () => {
  it("threshold 超の画素には触れない", () => {
    const a = new Float32Array([10, 20]);
    const b = new Float32Array([5, 8]);
    const L = new Float32Array([30, 80]);
    protectShadows(a, b, L, 2, 15);
    expect(a[0]).toBe(10);
    expect(a[1]).toBe(20);
  });

  it("L=0 の画素は ab がゼロになる（純黒）", () => {
    const a = new Float32Array([12]);
    const b = new Float32Array([-8]);
    const L = new Float32Array([0]);
    protectShadows(a, b, L, 1, 15);
    expect(a[0]).toBeCloseTo(0, 5);
    expect(b[0]).toBeCloseTo(0, 5);
  });

  it("L=7.5 では彩度が半減（factor=0.5）", () => {
    const a = new Float32Array([20]);
    const b = new Float32Array([10]);
    const L = new Float32Array([7.5]);
    protectShadows(a, b, L, 1, 15);
    expect(a[0]).toBeCloseTo(10, 4);
    expect(b[0]).toBeCloseTo(5, 4);
  });

  it("色相（a:b 比）を保存したまま彩度を減らす", () => {
    const a = new Float32Array([9]);
    const b = new Float32Array([12]);
    const L = new Float32Array([5]);
    protectShadows(a, b, L, 1, 15);
    expect(a[0] / b[0]).toBeCloseTo(9 / 12, 5);
  });
});

describe("protectHighlights", () => {
  it("threshold 未満の画素には触れない", () => {
    const a = new Float32Array([10, 20]);
    const b = new Float32Array([5, 8]);
    const L = new Float32Array([50, 70]);
    protectHighlights(a, b, L, 2, 75);
    expect(a[0]).toBe(10);
    expect(a[1]).toBe(20);
  });

  it("L=100 の画素は ab がゼロになる（純白）", () => {
    const a = new Float32Array([15]);
    const b = new Float32Array([20]);
    const L = new Float32Array([100]);
    protectHighlights(a, b, L, 1, 75);
    expect(a[0]).toBeCloseTo(0, 5);
    expect(b[0]).toBeCloseTo(0, 5);
  });

  it("L=threshold の画素は変化しない（factor=1.0）", () => {
    const a = new Float32Array([15]);
    const b = new Float32Array([20]);
    const L = new Float32Array([75]);
    protectHighlights(a, b, L, 1, 75);
    expect(a[0]).toBeCloseTo(15, 4);
    expect(b[0]).toBeCloseTo(20, 4);
  });

  it("L=87.5 では彩度が半減（factor=0.5）", () => {
    const a = new Float32Array([20]);
    const b = new Float32Array([10]);
    const L = new Float32Array([87.5]);
    protectHighlights(a, b, L, 1, 75);
    expect(a[0]).toBeCloseTo(10, 4);
    expect(b[0]).toBeCloseTo(5, 4);
  });

  it("色相（a:b 比）を保存したまま彩度を減らす", () => {
    const a = new Float32Array([12]);
    const b = new Float32Array([9]);
    const origRatio = 12 / 9;
    const L = new Float32Array([90]);
    protectHighlights(a, b, L, 1, 75);
    expect(a[0] / b[0]).toBeCloseTo(origRatio, 5);
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

describe("removeCast", () => {
  it("strength=1.0 で全体平均を完全に除去する", () => {
    const a = new Float32Array([10, 20, 30]);
    const b = new Float32Array([5, 5, 5]);
    removeCast(a, b, 3, 1.0);
    const meanA = (a[0] + a[1] + a[2]) / 3;
    const meanB = (b[0] + b[1] + b[2]) / 3;
    expect(meanA).toBeCloseTo(0, 5);
    expect(meanB).toBeCloseTo(0, 5);
  });

  it("strength=0.5 で平均を半分にする", () => {
    // 元 mean = 10
    const a = new Float32Array([10, 10, 10]);
    const b = new Float32Array([0, 0, 0]);
    removeCast(a, b, 3, 0.5);
    expect(a[0]).toBeCloseTo(5, 5);
    expect(a[1]).toBeCloseTo(5, 5);
    expect(a[2]).toBeCloseTo(5, 5);
  });

  it("relative な値の差は保存される", () => {
    const a = new Float32Array([0, 10, 20]);
    const b = new Float32Array([0, 0, 0]);
    removeCast(a, b, 3, 1.0);
    // 差分 (10, 10) は不変
    expect(a[1] - a[0]).toBeCloseTo(10, 5);
    expect(a[2] - a[1]).toBeCloseTo(10, 5);
  });

  it("strength=0 で何も変わらない", () => {
    const a = new Float32Array([5, 10, 15]);
    const b = new Float32Array([2, 4, 6]);
    const aCopy = a.slice(0);
    const bCopy = b.slice(0);
    removeCast(a, b, 3, 0);
    for (let i = 0; i < 3; i++) {
      expect(a[i]).toBe(aCopy[i]);
      expect(b[i]).toBe(bCopy[i]);
    }
  });

  it("暖色バイアス（a>0, b>0）を除去するとより中立になる", () => {
    // 暖色バイアスの模擬: 全画素が a=8, b=15 シフト
    const base = 5;
    const bias = { a: 8, b: 15 };
    const a = new Float32Array([base + bias.a, -base + bias.a, base + bias.a]);
    const b = new Float32Array([base + bias.b, base + bias.b, -base + bias.b]);
    removeCast(a, b, 3, 0.5);
    const meanA = (a[0] + a[1] + a[2]) / 3;
    const meanB = (b[0] + b[1] + b[2]) / 3;
    // 補正後の平均は元の半分に近づくはず
    expect(Math.abs(meanA)).toBeLessThan(Math.abs(bias.a));
    expect(Math.abs(meanB)).toBeLessThan(Math.abs(bias.b));
  });
});
