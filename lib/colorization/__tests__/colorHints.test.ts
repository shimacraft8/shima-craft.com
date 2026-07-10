import { describe, expect, it } from "vitest";
import {
  applyColorHints,
  bilinearResize,
  boxFilter,
  type ColorHintPayload,
  type PersonPartsMask,
} from "../colorHints";

/** width×height の L 一定・ab=0 のチャンネルセットを作る */
function makeChannels(width: number, height: number, lValue: number) {
  const n = width * height;
  return {
    a: new Float32Array(n),
    b: new Float32Array(n),
    L: new Float32Array(n).fill(lValue),
    n,
  };
}

describe("applyColorHints (空間bbox対応)", () => {
  it("box 内かつ輝度帯内の画素だけが目標色へ動く", () => {
    const width = 100;
    const height = 100;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "face",
          box: { x0: 0, y0: 0, x1: 0.4, y1: 0.4 },
          luminanceMin: 50,
          luminanceMax: 76,
          aTarget: 10,
          bTarget: 22,
          weight: 0.4,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints);

    // box 中心 (20,20): フルウェイトで適用
    const inside = 20 * width + 20;
    expect(a[inside]).toBeCloseTo(10 * 0.4, 1);
    expect(b[inside]).toBeCloseTo(22 * 0.4, 1);

    // box から遠い画素 (80,80): 変更なし
    const outside = 80 * width + 80;
    expect(a[outside]).toBe(0);
    expect(b[outside]).toBe(0);
  });

  it("輝度帯の外の画素は box 内でも変更されない", () => {
    const width = 50;
    const height = 50;
    const { a, b, L, n } = makeChannels(width, height, 20); // 暗い画素
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "sky",
          box: { x0: 0, y0: 0, x1: 1, y1: 1 },
          luminanceMin: 70,
          luminanceMax: 95,
          aTarget: -4,
          bTarget: -28,
          weight: 0.4,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints);
    expect(a[0]).toBe(0);
    expect(b[0]).toBe(0);
  });

  it("box なし領域は weight が 0.2 に制限される（全体ウォッシュ防止）", () => {
    const width = 50;
    const height = 50;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "global",
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: 20,
          bTarget: 20,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints);
    const center = 25 * width + 25;
    expect(a[center]).toBeCloseTo(20 * 0.2, 1);
    expect(b[center]).toBeCloseTo(20 * 0.2, 1);
  });

  it("複数領域が重なる場合は実効 weight が最大のものを採用する", () => {
    const width = 100;
    const height = 100;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "weak",
          box: { x0: 0, y0: 0, x1: 1, y1: 1 },
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: -20,
          bTarget: 0,
          weight: 0.2,
        },
        {
          label: "strong",
          box: { x0: 0.3, y0: 0.3, x1: 0.7, y1: 0.7 },
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: 10,
          bTarget: 22,
          weight: 0.45,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints);
    // 中心 (50,50) は strong が勝つ
    const center = 50 * width + 50;
    expect(a[center]).toBeCloseTo(10 * 0.45, 1);
    // strong の box 外（フェザー・フィルタ裾野からも十分離れた点）は weak のみ
    const corner = 15 * width + 15;
    expect(a[corner]).toBeCloseTo(-20 * 0.2, 1);
  });

  it("box の縁はフェザーで滑らかに減衰する（段差なし）", () => {
    const width = 200;
    const height = 200;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "region",
          box: { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 },
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: 30,
          bTarget: 0,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints);
    const row = 100; // 縦中央
    const deepInside = row * width + 100;
    const nearEdge = row * width + 150; // x=150 = box 右端(0.75*200)
    const outside = row * width + 180;
    // 内部 > 縁 > 外部 の単調減衰（外部はフィルタ裾野を含めてもほぼゼロ）
    expect(a[deepInside]).toBeGreaterThan(a[nearEdge]);
    expect(a[nearEdge]).toBeGreaterThan(0);
    expect(Math.abs(a[outside])).toBeLessThan(0.5);
  });

  it("マスクが輝度エッジにスナップする（bbox はみ出し側が減衰する）", () => {
    // 左半分 L=40（暗い被写体）、右半分 L=85（明るい背景）。
    // box は境界を越えて右側までかかっているが、輝度帯 30-55 が被写体側のみを指すため
    // ガイデッドフィルタ後も背景側には色がほぼ乗らない。
    const width = 200;
    const height = 200;
    const n = width * height;
    const a = new Float32Array(n);
    const b = new Float32Array(n);
    const L = new Float32Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        L[y * width + x] = x < 100 ? 40 : 85;
      }
    }
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "uniform",
          box: { x0: 0.1, y0: 0.1, x1: 0.7, y1: 0.9 }, // 境界(x=100)を越えて x=140 まで
          luminanceMin: 30,
          luminanceMax: 55,
          aTarget: 2,
          bTarget: 16,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints);
    const subject = 100 * width + 60; // 被写体側 box 内
    const background = 100 * width + 130; // 背景側 box 内（輝度帯の外）
    expect(b[subject]).toBeGreaterThan(4); // 被写体には色が乗る
    expect(Math.abs(b[background])).toBeLessThan(b[subject] * 0.25); // 背景はほぼ乗らない
  });

  it("boxFilter は一様入力を保存し、bilinearResize は定数マップを保存する", () => {
    const uniform = new Float32Array(50 * 40).fill(0.3);
    const blurred = boxFilter(uniform, 50, 40, 5);
    expect(blurred[0]).toBeCloseTo(0.3, 5);
    expect(blurred[20 * 50 + 25]).toBeCloseTo(0.3, 5);

    const resized = bilinearResize(uniform, 50, 40, 123, 77);
    expect(resized[0]).toBeCloseTo(0.3, 5);
    expect(resized[40 * 123 + 60]).toBeCloseTo(0.3, 5);
  });

  it("skin カテゴリはパーツマスクの肌画素だけに適用される（box が広くても）", () => {
    // 左半分=顔の肌(クラス3)、右半分=背景(クラス0)のパーツマスク。
    // box は画像全体だが、肌画素にしか色が乗らないこと。
    const width = 100;
    const height = 100;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const partData = new Uint8Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        partData[y * width + x] = x < 50 ? 3 : 0;
      }
    }
    const parts: PersonPartsMask = { data: partData, width, height };
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "faces",
          category: "skin",
          box: { x0: 0, y0: 0, x1: 1, y1: 1 },
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: 10,
          bTarget: 22,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints, 1, parts);
    const skinPixel = 50 * width + 20; // 肌側の内部
    const bgPixel = 50 * width + 80; // 背景側の内部
    expect(a[skinPixel]).toBeCloseTo(10 * 0.5, 1);
    expect(Math.abs(a[bgPixel])).toBeLessThan(0.5);
  });

  it("background カテゴリは人物画素に色を乗せない", () => {
    const width = 100;
    const height = 100;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const partData = new Uint8Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        partData[y * width + x] = x < 50 ? 4 : 0; // 左=服, 右=背景
      }
    }
    const parts: PersonPartsMask = { data: partData, width, height };
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "trees",
          category: "background",
          box: { x0: 0, y0: 0, x1: 1, y1: 1 },
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: -18,
          bTarget: 16,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints, 1, parts);
    const clothesPixel = 50 * width + 20;
    const bgPixel = 50 * width + 80;
    expect(Math.abs(a[clothesPixel])).toBeLessThan(0.5); // 服（人物）には乗らない
    expect(a[bgPixel]).toBeCloseTo(-18 * 0.5, 1); // 背景には乗る
  });

  it("パーツマスク照合できるカテゴリ領域は box なしでも weight 制限されない", () => {
    const width = 50;
    const height = 50;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const partData = new Uint8Array(n).fill(3); // 全画素=顔の肌
    const parts: PersonPartsMask = { data: partData, width, height };
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "skin without box",
          category: "skin",
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: 10,
          bTarget: 22,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints, 1, parts);
    const center = 25 * width + 25;
    // boxless の 0.2 制限ではなく weight 0.5 がそのまま効く
    expect(a[center]).toBeCloseTo(10 * 0.5, 1);
  });

  it("strength 引き上げ（手塗りモード）で weight が上限 0.9 まで増幅される", () => {
    const width = 100;
    const height = 100;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "uniform",
          box: { x0: 0, y0: 0, x1: 1, y1: 1 },
          luminanceMin: 40,
          luminanceMax: 80,
          aTarget: 2,
          bTarget: 16,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints, 1.9); // セピア崩壊時の strength
    const center = 50 * width + 50;
    // 0.5 × 1.9 = 0.95 → 上限 0.9 でクランプ
    expect(b[center]).toBeCloseTo(16 * 0.9, 1);
  });

  it("L チャンネルは一切変更されない", () => {
    const width = 20;
    const height = 20;
    const { a, b, L, n } = makeChannels(width, height, 60);
    const before = L.slice(0);
    const hints: ColorHintPayload = {
      scene: "test",
      regions: [
        {
          label: "r",
          box: { x0: 0, y0: 0, x1: 1, y1: 1 },
          luminanceMin: 0,
          luminanceMax: 100,
          aTarget: 30,
          bTarget: 30,
          weight: 0.5,
        },
      ],
    };
    applyColorHints(a, b, L, n, width, height, hints);
    expect(L).toEqual(before);
  });
});
