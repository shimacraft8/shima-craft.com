import { describe, expect, it } from "vitest";
import { applyColorHints, type ColorHintPayload } from "../colorHints";

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
    // 隅 (5,5) は weak のみ
    const corner = 5 * width + 5;
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
    const outside = row * width + 170;
    // 内部 > 縁 > 外部 の単調減衰
    expect(a[deepInside]).toBeGreaterThan(a[nearEdge]);
    expect(a[nearEdge]).toBeGreaterThan(0);
    expect(a[outside]).toBe(0);
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
