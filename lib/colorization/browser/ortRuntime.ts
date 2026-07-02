/**
 * onnxruntime-web（public/ort/ に同梱した v1.27.0, MIT）の読み込みと
 * 推論セッション管理。
 *
 * - ランタイムはページ表示時ではなく、カラー化開始時に動的 import する
 * - WebGPU が使える環境では webgpu EP + fp16 モデル、
 *   使えない環境では wasm EP + int8 量子化モデルを選ぶ
 * - モデルは Cache Storage API でキャッシュし、2回目以降の再ダウンロードを避ける
 * - 入力画像はネットワークへ一切送らない（このモジュールが fetch するのは
 *   同一オリジンのランタイム・モデルファイルのみ）
 */

import type { ColorizeBackend, ColorizeProgress } from "@/lib/colorization/types";

export const ORT_BUNDLE_PATH = "/ort/ort.min.mjs";
export const ORT_WASM_DIR = "/ort/";
export const MODEL_PATHS: Record<ColorizeBackend, string> = {
  webgpu: "/models/siggraph17_fp16.onnx",
  wasm: "/models/siggraph17_int8.onnx",
};
export const MODEL_CACHE_NAME = "colorize-model-v1";
export const MODEL_INPUT_SIZE = 256;

/** onnxruntime-web の利用箇所に必要な最小限の型。 */
export type OrtTensor = { data: Float32Array };
export type OrtSession = {
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
  release(): Promise<void>;
};
export type OrtModule = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  InferenceSession: {
    create(
      buffer: ArrayBuffer,
      options: { executionProviders: ColorizeBackend[] }
    ): Promise<OrtSession>;
  };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
};

/** WebGPU の有無でバックエンドを選ぶ。 */
export function selectBackend(nav: { gpu?: unknown } = navigator as { gpu?: unknown }): ColorizeBackend {
  return nav.gpu ? "webgpu" : "wasm";
}

let ortModulePromise: Promise<OrtModule> | null = null;

export function loadOrtModule(): Promise<OrtModule> {
  if (!ortModulePromise) {
    ortModulePromise = import(
      /* webpackIgnore: true */ `${window.location.origin}${ORT_BUNDLE_PATH}`
    ).then((mod: OrtModule) => {
      mod.env.wasm.wasmPaths = `${window.location.origin}${ORT_WASM_DIR}`;
      // COOP/COEP ヘッダーを付けない構成のため、マルチスレッドは使わない
      mod.env.wasm.numThreads = 1;
      return mod;
    });
    // 失敗した import をキャッシュしない（再試行できるようにする）
    ortModulePromise.catch(() => {
      ortModulePromise = null;
    });
  }
  return ortModulePromise;
}

/**
 * モデルを取得する。Cache Storage が使えれば永続キャッシュし、
 * 使えない環境（プライベートブラウズ等）ではブラウザのHTTPキャッシュに任せる。
 */
export async function fetchModel(
  url: string,
  onProgress: (p: ColorizeProgress) => void,
  signal: AbortSignal
): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    if (typeof caches !== "undefined") {
      cache = await caches.open(MODEL_CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) {
        const buf = await hit.arrayBuffer();
        onProgress({ stage: "downloading_model", loadedBytes: buf.byteLength, totalBytes: buf.byteLength });
        return buf;
      }
    }
  } catch {
    cache = null; // Cache Storage が使えなくても処理は続行する
  }

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`model fetch failed: HTTP ${res.status}`);

  const total = Number(res.headers.get("content-length")) || null;
  let buf: ArrayBuffer;

  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.byteLength;
        onProgress({ stage: "downloading_model", loadedBytes: loaded, totalBytes: total });
      }
    }
    const merged = new Uint8Array(loaded);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    buf = merged.buffer;
  } else {
    buf = await res.arrayBuffer();
    onProgress({ stage: "downloading_model", loadedBytes: buf.byteLength, totalBytes: total });
  }

  if (cache) {
    try {
      await cache.put(url, new Response(buf.slice(0), { headers: { "Content-Type": "application/octet-stream" } }));
    } catch {
      // 容量不足等でキャッシュできなくても無視（次回再ダウンロードされるだけ）
    }
  }
  return buf;
}

export type ReadySession = {
  session: OrtSession;
  ort: OrtModule;
  backend: ColorizeBackend;
  modelDownloadMs: number;
  initMs: number;
};

// バックエンドごとにセッションを保持し、同じページ内での再実行を高速にする
const sessionCache = new Map<ColorizeBackend, ReadySession>();

export function getCachedSession(backend: ColorizeBackend): ReadySession | undefined {
  return sessionCache.get(backend);
}

export function clearSessionCache(): void {
  sessionCache.clear();
}

/**
 * 指定バックエンドのセッションを用意する。WebGPU での初期化に失敗した場合、
 * 呼び出し側が wasm で再試行できるよう例外を投げ分ける。
 */
export async function createSession(
  backend: ColorizeBackend,
  onProgress: (p: ColorizeProgress) => void,
  signal: AbortSignal
): Promise<ReadySession> {
  const cached = sessionCache.get(backend);
  if (cached) return cached;

  const ort = await loadOrtModule();

  const t0 = performance.now();
  const modelBuf = await fetchModel(MODEL_PATHS[backend], onProgress, signal);
  const t1 = performance.now();

  onProgress({ stage: "initializing", backend });
  const session = await ort.InferenceSession.create(modelBuf, { executionProviders: [backend] });
  const t2 = performance.now();

  const ready: ReadySession = {
    session,
    ort,
    backend,
    modelDownloadMs: t1 - t0,
    initMs: t2 - t1,
  };
  sessionCache.set(backend, ready);
  return ready;
}
