import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_DIMENSION,
  MAX_DIMENSION_LOW_MEMORY,
  buildDownloadFilename,
  computeTargetSize,
  maxDimensionForDevice,
  revokePreviewUrl,
} from "../imageProcessing";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("computeTargetSize", () => {
  it("上限以内なら縮小しない", () => {
    expect(computeTargetSize(800, 600, 2400)).toEqual({ width: 800, height: 600, resized: false });
  });

  it("長辺を上限に合わせ、縦横比を維持して縮小する", () => {
    const r = computeTargetSize(4800, 3600, 2400);
    expect(r.resized).toBe(true);
    expect(r.width).toBe(2400);
    expect(r.height).toBe(1800);
    expect(r.width / r.height).toBeCloseTo(4800 / 3600, 3);
  });

  it("縦長画像も同様に処理する", () => {
    const r = computeTargetSize(1000, 5000, 2400);
    expect(r.height).toBe(2400);
    expect(r.width).toBe(480);
  });
});

describe("maxDimensionForDevice", () => {
  it("メモリの少ない端末では小さい上限を使う", () => {
    expect(maxDimensionForDevice({ deviceMemory: 2 })).toBe(MAX_DIMENSION_LOW_MEMORY);
    expect(maxDimensionForDevice({ deviceMemory: 4 })).toBe(MAX_DIMENSION_LOW_MEMORY);
  });

  it("メモリが十分・不明な端末では通常上限を使う", () => {
    expect(maxDimensionForDevice({ deviceMemory: 8 })).toBe(MAX_DIMENSION);
    expect(maxDimensionForDevice({})).toBe(MAX_DIMENSION);
  });
});

describe("revokePreviewUrl", () => {
  it("URLがあれば revokeObjectURL を呼ぶ", () => {
    const spy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    revokePreviewUrl("blob:abc");
    expect(spy).toHaveBeenCalledWith("blob:abc");
  });

  it("null/undefined では何もしない", () => {
    const spy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    revokePreviewUrl(null);
    revokePreviewUrl(undefined);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("buildDownloadFilename", () => {
  it("元ファイル名を含まない安全な名前を生成する", () => {
    const name = buildDownloadFilename();
    expect(name).toMatch(/^shimacraft-colorized-[\dTZ-]+\.jpg$/);
  });
});
