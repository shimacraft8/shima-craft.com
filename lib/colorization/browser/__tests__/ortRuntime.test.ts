import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColorizeProgress } from "@/lib/colorization/types";
import { MODEL_PATHS, ORT_BUNDLE_PATH, ORT_WASM_DIR, fetchModel, selectBackend } from "../ortRuntime";

describe("selectBackend", () => {
  it("navigator.gpu があれば webgpu、なければ wasm", () => {
    expect(selectBackend({ gpu: {} })).toBe("webgpu");
    expect(selectBackend({})).toBe("wasm");
  });
});

describe("配信パス（同一オリジン）", () => {
  it("モデル・ランタイムとも相対パス（同一オリジン）で、外部ホストを参照しない", () => {
    for (const p of [MODEL_PATHS.webgpu, MODEL_PATHS.wasm, ORT_BUNDLE_PATH, ORT_WASM_DIR]) {
      expect(p.startsWith("/")).toBe(true);
      expect(p).not.toMatch(/^https?:/);
    }
  });
});

describe("fetchModel", () => {
  const url = "/models/test.onnx";
  const bytes = new Uint8Array([1, 2, 3, 4]);

  beforeEach(() => {
    vi.stubGlobal("caches", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ダウンロード進捗を通知し、全バイトを返す", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2));
        controller.enqueue(bytes.slice(2));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream, { headers: { "content-length": "4" } }))
    );

    const events: ColorizeProgress[] = [];
    const buf = await fetchModel(url, (p) => events.push(p), new AbortController().signal);
    expect(new Uint8Array(buf)).toEqual(bytes);
    const dl = events.filter((e) => e.stage === "downloading_model");
    expect(dl.length).toBeGreaterThanOrEqual(2);
    expect(dl[dl.length - 1]).toMatchObject({ loadedBytes: 4, totalBytes: 4 });
  });

  it("HTTPエラーは例外にする", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    await expect(fetchModel(url, () => {}, new AbortController().signal)).rejects.toThrow(/HTTP 404/);
  });

  it("Cache Storage にヒットしたら fetch しない", async () => {
    const cached = new Response(bytes.buffer.slice(0));
    const cache = {
      match: vi.fn(async () => cached),
      put: vi.fn(),
    };
    vi.stubGlobal("caches", { open: vi.fn(async () => cache) });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const buf = await fetchModel(url, () => {}, new AbortController().signal);
    expect(new Uint8Array(buf)).toEqual(bytes);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("キャッシュミス時は取得後に cache.put で保存する", async () => {
    const cache = {
      match: vi.fn(async () => undefined),
      put: vi.fn(async () => {}),
    };
    vi.stubGlobal("caches", { open: vi.fn(async () => cache) });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes.buffer.slice(0))));

    await fetchModel(url, () => {}, new AbortController().signal);
    expect(cache.put).toHaveBeenCalledWith(url, expect.any(Response));
  });
});
