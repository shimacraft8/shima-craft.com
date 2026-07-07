import { describe, expect, it } from "vitest";
import {
  cropResizeRgba,
  detectHorizontalSplits,
  detectVerticalSplits,
  splitIntoTiles,
  stitchAbChannels,
} from "../collage";

// RGBA helper: fill a row with a given luma (r=g=b=luma, a=255)
function makeRgba(width: number, height: number, fillFn: (y: number) => number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = fillFn(y);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

// RGBA helper: fill columns with a given luma
function makeRgbaByColumn(width: number, height: number, fillFn: (x: number) => number): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = fillFn(x);
      const i = (y * width + x) * 4;
      buf[i] = v;
      buf[i + 1] = v;
      buf[i + 2] = v;
      buf[i + 3] = 255;
    }
  }
  return buf;
}

describe("detectHorizontalSplits", () => {
  it("分割帯がない場合は空配列を返す", () => {
    // 均一グレーの画像（非分割行）
    const rgba = makeRgba(100, 100, () => 128);
    expect(detectHorizontalSplits(rgba, 100, 100)).toEqual([]);
  });

  it("中央付近の白帯を1つ検出する", () => {
    const H = 100;
    const rgba = makeRgba(50, H, (y) => (y >= 45 && y <= 55 ? 255 : 128));
    const splits = detectHorizontalSplits(rgba, 50, H);
    expect(splits).toHaveLength(1);
    expect(splits[0]).toBeGreaterThan(10);
    expect(splits[0]).toBeLessThan(90);
  });

  it("端の帯は除外される（10% / 90% 境界）", () => {
    // 先頭 5 行が白帯
    const rgba = makeRgba(50, 100, (y) => (y < 5 ? 255 : 128));
    expect(detectHorizontalSplits(rgba, 50, 100)).toEqual([]);
  });

  it("最大 2 分割まで", () => {
    // 3 か所に白帯を配置する
    const H = 200;
    const rgba = makeRgba(50, H, (y) => {
      if ((y >= 40 && y <= 50) || (y >= 95 && y <= 105) || (y >= 150 && y <= 160)) return 255;
      return 128;
    });
    const splits = detectHorizontalSplits(rgba, 50, H);
    expect(splits.length).toBeLessThanOrEqual(2);
  });
});

describe("detectVerticalSplits", () => {
  it("分割帯がない場合は空配列を返す", () => {
    const rgba = makeRgbaByColumn(100, 100, () => 128);
    expect(detectVerticalSplits(rgba, 100, 100)).toEqual([]);
  });

  it("中央付近の白帯（縦の余白）を1つ検出する", () => {
    const W = 100;
    const rgba = makeRgbaByColumn(W, 50, (x) => (x >= 45 && x <= 55 ? 255 : 128));
    const splits = detectVerticalSplits(rgba, W, 50);
    expect(splits).toHaveLength(1);
    expect(splits[0]).toBeGreaterThan(10);
    expect(splits[0]).toBeLessThan(90);
  });

  it("黒帯（暗い余白）も検出する", () => {
    const W = 100;
    const rgba = makeRgbaByColumn(W, 50, (x) => (x >= 48 && x <= 56 ? 5 : 128));
    const splits = detectVerticalSplits(rgba, W, 50);
    expect(splits).toHaveLength(1);
  });

  it("端の帯は除外される（10% / 90% 境界）", () => {
    const rgba = makeRgbaByColumn(100, 50, (x) => (x < 5 ? 255 : 128));
    expect(detectVerticalSplits(rgba, 100, 50)).toEqual([]);
  });
});

describe("cropResizeRgba", () => {
  it("同一サイズへのコピー（cropX=0, cropY=0）は元画像と一致する", () => {
    const rgba = makeRgba(4, 4, (y) => y * 20);
    const out = cropResizeRgba(rgba, 4, 0, 0, 4, 4, 4, 4);
    expect(out).toEqual(rgba);
  });

  it("出力サイズが正しい", () => {
    const rgba = makeRgba(10, 10, () => 100);
    const out = cropResizeRgba(rgba, 10, 0, 0, 10, 10, 4, 8);
    expect(out.length).toBe(4 * 8 * 4);
  });

  it("上半分のクロップ → 出力の先頭ピクセルが正しい色を持つ", () => {
    // 上半分 (y<5) = 50, 下半分 (y>=5) = 200
    const rgba = makeRgba(10, 10, (y) => (y < 5 ? 50 : 200));
    const out = cropResizeRgba(rgba, 10, 0, 0, 10, 5, 10, 5);
    expect(out[0]).toBe(50);
  });
});

describe("splitIntoTiles", () => {
  it("1 分割 → 2 タイルを生成する", () => {
    const H = 100;
    const rgba = makeRgba(50, H, () => 128);
    const tiles = splitIntoTiles(rgba, 50, H, [50], 256, 512);
    expect(tiles).toHaveLength(2);
    expect(tiles[0].startY).toBe(0);
    expect(tiles[1].startY).toBe(50);
  });

  it("タイルの幅・高さ・startY が正しい", () => {
    const rgba = makeRgba(40, 120, () => 100);
    const tiles = splitIntoTiles(rgba, 40, 120, [60], 256, 512);
    expect(tiles[0].height).toBe(60);
    expect(tiles[1].height).toBe(60);
    expect(tiles[0].width).toBe(40);
  });

  it("smallRgba / largeRgba のサイズが正しい", () => {
    const rgba = makeRgba(50, 100, () => 200);
    const tiles = splitIntoTiles(rgba, 50, 100, [50], 256, 512);
    expect(tiles[0].smallRgba.length).toBe(256 * 256 * 4);
    expect(tiles[0].largeRgba.length).toBe(512 * 512 * 4);
  });

  it("垂直分割 → 左右2タイル（startX が正しい）", () => {
    const W = 100;
    const rgba = makeRgbaByColumn(W, 60, () => 128);
    const tiles = splitIntoTiles(rgba, W, 60, [50], 256, 512, "vertical");
    expect(tiles).toHaveLength(2);
    expect(tiles[0].startX).toBe(0);
    expect(tiles[0].startY).toBe(0);
    expect(tiles[0].width).toBe(50);
    expect(tiles[0].height).toBe(60);
    expect(tiles[1].startX).toBe(50);
    expect(tiles[1].width).toBe(50);
  });
});

describe("stitchAbChannels", () => {
  it("上下タイルを正しい位置に結合する", () => {
    const a1 = new Float32Array([1, 2, 3, 4]); // 2x2 tile
    const b1 = new Float32Array([10, 20, 30, 40]);
    const a2 = new Float32Array([5, 6, 7, 8]);
    const b2 = new Float32Array([50, 60, 70, 80]);
    const { a, b } = stitchAbChannels(
      [
        { a: a1, b: b1, width: 2, height: 2, startX: 0, startY: 0 },
        { a: a2, b: b2, width: 2, height: 2, startX: 0, startY: 2 },
      ],
      2,
      4
    );
    expect(Array.from(a)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(Array.from(b)).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
  });

  it("左右タイルを正しい位置に結合する", () => {
    const a1 = new Float32Array([1, 3]); // 1x2 tile（左）
    const b1 = new Float32Array([10, 30]);
    const a2 = new Float32Array([2, 4]); // 1x2 tile（右）
    const b2 = new Float32Array([20, 40]);
    const { a, b } = stitchAbChannels(
      [
        { a: a1, b: b1, width: 1, height: 2, startX: 0, startY: 0 },
        { a: a2, b: b2, width: 1, height: 2, startX: 1, startY: 0 },
      ],
      2,
      2
    );
    // 行優先: [左上, 右上, 左下, 右下]
    expect(Array.from(a)).toEqual([1, 2, 3, 4]);
    expect(Array.from(b)).toEqual([10, 20, 30, 40]);
  });

  it("出力バッファのサイズが totalWidth * totalHeight", () => {
    const t = { a: new Float32Array(6), b: new Float32Array(6), width: 3, height: 2, startX: 0, startY: 0 };
    const { a, b } = stitchAbChannels([t], 3, 2);
    expect(a.length).toBe(6);
    expect(b.length).toBe(6);
  });
});
