import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ColorizeProgress } from "@/lib/colorization/types";
import {
  MODEL_PATHS,
  ORT_BUNDLE_PATH,
  ORT_WASM_DIR,
  __resetLargeAssetManifestCacheForTests,
  fetchModel,
  fetchModelFiles,
  selectBackend,
} from "../ortRuntime";

function nodeSha256Hex(bytes: Uint8Array): string {
  // ortRuntime.ts自身のsha256Hex(Web Crypto)とは独立した実装で期待値を計算する
  // （同じ実装のバグを見逃さないようにするため）。
  return createHash("sha256").update(bytes).digest("hex");
}

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

describe("fetchModelFiles: マニフェストによるSHA-256検証", () => {
  const part0 = new Uint8Array([1, 2, 3, 4]);
  const part1 = new Uint8Array([5, 6]);
  const combined = new Uint8Array([1, 2, 3, 4, 5, 6]);
  const manifestKey = "/models/test-chunked.onnx";
  const url0 = "https://example.test/models/test-chunked.onnx.part0";
  const url1 = "https://example.test/models/test-chunked.onnx.part1";

  function validManifest() {
    return {
      version: 1,
      maxChunkBytes: 25165824,
      files: {
        [manifestKey]: {
          path: manifestKey,
          totalBytes: combined.byteLength,
          sha256: nodeSha256Hex(combined),
          parts: [
            { name: "test-chunked.onnx.part0", bytes: part0.byteLength, sha256: nodeSha256Hex(part0) },
            { name: "test-chunked.onnx.part1", bytes: part1.byteLength, sha256: nodeSha256Hex(part1) },
          ],
        },
      },
    };
  }

  function stubFetch(manifest: unknown, partBytesByUrl: Record<string, Uint8Array>) {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        calls.push(input);
        if (input.endsWith("/large-assets.manifest.json")) {
          return manifest === null
            ? new Response("not found", { status: 404 })
            : new Response(JSON.stringify(manifest), { status: 200 });
        }
        const bytes = partBytesByUrl[input];
        if (!bytes) return new Response("not found", { status: 404 });
        return new Response(bytes.slice(0), { headers: { "content-length": String(bytes.byteLength) } });
      })
    );
    return calls;
  }

  beforeEach(() => {
    vi.stubGlobal("caches", undefined);
    vi.resetModules();
    // manifestPromiseはモジュールレベルでキャッシュされるため、テスト間で明示的にリセットする
    // （このテストファイルはortRuntimeを静的importしており、vi.resetModules()だけでは
    //  既にbind済みの参照が持つクロージャの状態までは戻らない）。
    __resetLargeAssetManifestCacheForTests();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("各パートを順番に（並列にせず）取得し、結合結果を返す", async () => {
    const calls = stubFetch(validManifest(), { [url0]: part0, [url1]: part1 });
    const buf = await fetchModelFiles([url0, url1], () => {}, new AbortController().signal, null, manifestKey);
    expect(new Uint8Array(buf)).toEqual(combined);
    // manifest取得 → part0 → part1 の順（並列なら順序が保証されない）
    expect(calls).toEqual([expect.stringContaining("large-assets.manifest.json"), url0, url1]);
  });

  it("パートのSHA-256が一致しない場合は例外にする（改ざん・破損検出）", async () => {
    const corrupted = new Uint8Array([9, 9, 3, 4]); // part0と同じ長さだが中身が違う
    stubFetch(validManifest(), { [url0]: corrupted, [url1]: part1 });
    await expect(
      fetchModelFiles([url0, url1], () => {}, new AbortController().signal, null, manifestKey)
    ).rejects.toThrow(/integrity check/);
  });

  it("結合後の全体SHA-256が一致しない場合は例外にする", async () => {
    const manifest = validManifest();
    manifest.files[manifestKey].sha256 = "0".repeat(64); // 意図的に不一致にする
    stubFetch(manifest, { [url0]: part0, [url1]: part1 });
    await expect(
      fetchModelFiles([url0, url1], () => {}, new AbortController().signal, null, manifestKey)
    ).rejects.toThrow(/integrity check/);
  });

  it("マニフェストに対象ファイルの記載が無い場合は検証をスキップして成功する（例: ddcolor等の未分割ファイル）", async () => {
    stubFetch({ version: 1, maxChunkBytes: 1, files: {} }, { [url0]: part0, [url1]: part1 });
    const buf = await fetchModelFiles(
      [url0, url1],
      () => {},
      new AbortController().signal,
      null,
      "/models/not-in-manifest.onnx"
    );
    expect(new Uint8Array(buf)).toEqual(combined);
  });

  it("マニフェスト自体が取得できない場合も検証なしで成功する（可用性優先、HTTPSが転送の完全性は担保するため）", async () => {
    stubFetch(null, { [url0]: part0, [url1]: part1 });
    const buf = await fetchModelFiles([url0, url1], () => {}, new AbortController().signal, null, manifestKey);
    expect(new Uint8Array(buf)).toEqual(combined);
  });

  it("manifestKeyを渡さない場合はマニフェスト自体を取得しない（既存のfetchModel等の挙動を変えない）", async () => {
    const calls = stubFetch(validManifest(), { [url0]: part0 });
    await fetchModelFiles([url0], () => {}, new AbortController().signal);
    expect(calls).not.toContainEqual(expect.stringContaining("large-assets.manifest.json"));
  });
});

describe("loadOrtModule: wasmBinaryの事前取得・検証", () => {
  const wasmPart0 = new Uint8Array([10, 20, 30]);
  const wasmPart1 = new Uint8Array([40, 50]);
  const wasmCombined = new Uint8Array([10, 20, 30, 40, 50]);

  beforeEach(() => {
    vi.stubGlobal("caches", undefined);
    vi.resetModules();
    // manifestPromiseはモジュールレベルでキャッシュされるため、テスト間で明示的にリセットする
    // （このテストファイルはortRuntimeを静的importしており、vi.resetModules()だけでは
    //  既にbind済みの参照が持つクロージャの状態までは戻らない）。
    __resetLargeAssetManifestCacheForTests();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("wasm本体を分割取得・結合し、env.wasm.wasmBinaryへ設定する（wasmPathsも維持しつつ、numThreads=1のまま）", async () => {
    const fakeOrtModule = {
      env: { wasm: { wasmPaths: "", numThreads: 4 } },
    };
    vi.doMock(`${window.location.origin}/ort/ort.min.mjs`, () => fakeOrtModule);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("large-assets.manifest.json")) {
          return new Response(
            JSON.stringify({
              version: 1,
              maxChunkBytes: 25165824,
              files: {
                "/ort/ort-wasm-simd-threaded.jsep.wasm": {
                  path: "/ort/ort-wasm-simd-threaded.jsep.wasm",
                  totalBytes: wasmCombined.byteLength,
                  sha256: nodeSha256Hex(wasmCombined),
                  parts: [
                    { name: "x.part0", bytes: wasmPart0.byteLength, sha256: nodeSha256Hex(wasmPart0) },
                    { name: "x.part1", bytes: wasmPart1.byteLength, sha256: nodeSha256Hex(wasmPart1) },
                  ],
                },
              },
            }),
            { status: 200 }
          );
        }
        if (input.endsWith(".jsep.wasm.part0")) return new Response(wasmPart0.slice(0));
        if (input.endsWith(".jsep.wasm.part1")) return new Response(wasmPart1.slice(0));
        return new Response("not found", { status: 404 });
      })
    );

    const { loadOrtModule: freshLoadOrtModule } = await import("../ortRuntime");
    const mod = await freshLoadOrtModule(() => {}, new AbortController().signal);

    expect(new Uint8Array(mod.env.wasm.wasmBinary as ArrayBufferLike)).toEqual(wasmCombined);
    expect(mod.env.wasm.wasmPaths).toBe(`${window.location.origin}/ort/`);
    expect(mod.env.wasm.numThreads).toBe(1);
  });
});
