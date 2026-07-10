/**
 * onnxruntime-web（public/ort/ に同梱した v1.27.0, MIT）の読み込みと
 * 推論セッション管理。
 *
 * - ランタイムはページ表示時ではなく、カラー化開始時に動的 import する
 * - モデルは「標準(siggraph17)」と「高品質(DDColor)」の2種類:
 *   - siggraph17: L入力256、WebGPU=fp16 / WASM=int8（軽量・高速）
 *   - DDColor  : グレーRGB入力512、WebGPU=fp32 / WASM=fp16（人物・発色が自然）
 *     100MB超のためGitHub制限回避に分割配信し、取得後に結合してから初期化する
 * - モデルは Cache Storage API でキャッシュし、2回目以降の再ダウンロードを避ける
 * - 入力画像はネットワークへ一切送らない（このモジュールが fetch するのは
 *   同一オリジンのランタイム・モデルファイルのみ）
 */

import type { ColorizeBackend, ColorizeProgress } from "@/lib/colorization/types";

export const ORT_BUNDLE_PATH = "/ort/ort.min.mjs";
export const ORT_WASM_DIR = "/ort/";

/** カラー化モデルの種類。standard=siggraph17 / high=DDColor。 */
export type ColorizeModelId = "siggraph17" | "ddcolor";

/** 入力の与え方。L=輝度1ch(0..100) / grayRGB=グレー3ch(0..1)。 */
export type ModelInputKind = "L" | "grayRGB";

export type ModelSpec = {
  id: ColorizeModelId;
  inputSize: number;
  inputKind: ModelInputKind;
  inputName: string;
  /** バックエンドごとの配信ファイル（複数=分割・順に結合）。すべて同一オリジン。 */
  files: Record<ColorizeBackend, string[]>;
};

export const MODELS: Record<ColorizeModelId, ModelSpec> = {
  siggraph17: {
    id: "siggraph17",
    inputSize: 256,
    inputKind: "L",
    inputName: "input_l",
    files: {
      webgpu: ["/models/siggraph17_fp16.onnx"],
      wasm: ["/models/siggraph17_int8.onnx"],
    },
  },
  ddcolor: {
    id: "ddcolor",
    inputSize: 512,
    inputKind: "grayRGB",
    inputName: "input",
    files: {
      webgpu: [
        "/models/ddcolor_webgpu.onnx.part0",
        "/models/ddcolor_webgpu.onnx.part1",
        "/models/ddcolor_webgpu.onnx.part2",
      ],
      wasm: ["/models/ddcolor_wasm.onnx.part0", "/models/ddcolor_wasm.onnx.part1"],
    },
  },
};

/** siggraph17 の入力サイズ（後方互換のため既存名を維持）。 */
export const MODEL_INPUT_SIZE = MODELS.siggraph17.inputSize;
/** 後方互換: siggraph17 のモデルパス。 */
export const MODEL_PATHS: Record<ColorizeBackend, string> = {
  webgpu: MODELS.siggraph17.files.webgpu[0],
  wasm: MODELS.siggraph17.files.wasm[0],
};
// v3: DDColor を古写真向けファインチューニング版へ差し替え（2026-07-10）
export const MODEL_CACHE_NAME = "colorize-model-v3";

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

async function fetchOnePart(
  url: string,
  onChunk: (bytes: number, contentLength: number | null) => void,
  signal: AbortSignal
): Promise<{ data: Uint8Array; contentLength: number | null }> {
  let cache: Cache | null = null;
  try {
    if (typeof caches !== "undefined") {
      cache = await caches.open(MODEL_CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) {
        const buf = new Uint8Array(await hit.arrayBuffer());
        onChunk(buf.byteLength, buf.byteLength);
        return { data: buf, contentLength: buf.byteLength };
      }
    }
  } catch {
    cache = null;
  }

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`model fetch failed: HTTP ${res.status}`);
  const contentLength = Number(res.headers.get("content-length")) || null;

  let out: Uint8Array;
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
        onChunk(value.byteLength, contentLength);
      }
    }
    out = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.byteLength;
    }
  } else {
    out = new Uint8Array(await res.arrayBuffer());
    onChunk(out.byteLength, contentLength ?? out.byteLength);
  }

  if (cache) {
    try {
      await cache.put(url, new Response(out.slice(0), { headers: { "Content-Type": "application/octet-stream" } }));
    } catch {
      // 容量不足等は無視
    }
  }
  return { data: out, contentLength: contentLength ?? out.byteLength };
}

/**
 * 1つ以上のファイル（分割モデル）を取得し、順に結合して1つのArrayBufferにする。
 * 各パートの content-length が取れれば合算を進捗の総量に使い、
 * 取れない場合は totalBytesHint（概算）を使う。
 */
export async function fetchModelFiles(
  urls: string[],
  onProgress: (p: ColorizeProgress) => void,
  signal: AbortSignal,
  totalBytesHint: number | null = null
): Promise<ArrayBuffer> {
  const parts: Uint8Array[] = [];
  const single = urls.length === 1;
  let loaded = 0;
  for (const url of urls) {
    const { data } = await fetchOnePart(
      url,
      (bytes, contentLength) => {
        loaded += bytes;
        // 単一ファイルは content-length を、分割は概算ヒントを進捗の総量に使う
        onProgress({
          stage: "downloading_model",
          loadedBytes: loaded,
          totalBytes: single ? contentLength : totalBytesHint,
        });
      },
      signal
    );
    parts.push(data);
  }
  const total = parts.reduce((s, p) => s + p.byteLength, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    merged.set(p, off);
    off += p.byteLength;
  }
  return merged.buffer as ArrayBuffer;
}

/** 後方互換: 単一URLモデルの取得。 */
export function fetchModel(
  url: string,
  onProgress: (p: ColorizeProgress) => void,
  signal: AbortSignal
): Promise<ArrayBuffer> {
  return fetchModelFiles([url], onProgress, signal);
}

export type ReadySession = {
  session: OrtSession;
  ort: OrtModule;
  backend: ColorizeBackend;
  model: ModelSpec;
  modelDownloadMs: number;
  initMs: number;
};

// (modelId, backend) ごとにセッションを保持し、同じページ内での再実行を高速にする
const sessionCache = new Map<string, ReadySession>();
const cacheKey = (modelId: ColorizeModelId, backend: ColorizeBackend) => `${modelId}:${backend}`;

export function getCachedSession(
  modelId: ColorizeModelId,
  backend: ColorizeBackend
): ReadySession | undefined {
  return sessionCache.get(cacheKey(modelId, backend));
}

export function clearSessionCache(): void {
  sessionCache.clear();
}

/** 概算のダウンロード総量（進捗バー用）。 */
const APPROX_TOTAL_BYTES: Record<string, number> = {
  "siggraph17:webgpu": 68_000_000,
  "siggraph17:wasm": 44_000_000,
  "ddcolor:webgpu": 242_000_000,
  "ddcolor:wasm": 121_000_000,
};

/**
 * 指定モデル・バックエンドのセッションを用意する。WebGPUでの初期化に失敗した場合、
 * 呼び出し側が wasm で再試行できるよう例外を投げ分ける。
 */
export async function createSessionForModel(
  modelId: ColorizeModelId,
  backend: ColorizeBackend,
  onProgress: (p: ColorizeProgress) => void,
  signal: AbortSignal
): Promise<ReadySession> {
  const cached = sessionCache.get(cacheKey(modelId, backend));
  if (cached) return cached;

  const model = MODELS[modelId];
  const ort = await loadOrtModule();

  const t0 = performance.now();
  const modelBuf = await fetchModelFiles(
    model.files[backend],
    onProgress,
    signal,
    APPROX_TOTAL_BYTES[cacheKey(modelId, backend)] ?? null
  );
  const t1 = performance.now();

  onProgress({ stage: "initializing", backend });
  const session = await ort.InferenceSession.create(modelBuf, { executionProviders: [backend] });
  const t2 = performance.now();

  const ready: ReadySession = {
    session,
    ort,
    backend,
    model,
    modelDownloadMs: t1 - t0,
    initMs: t2 - t1,
  };
  sessionCache.set(cacheKey(modelId, backend), ready);
  return ready;
}

/** 後方互換: siggraph17 のセッションを用意する。 */
export function createSession(
  backend: ColorizeBackend,
  onProgress: (p: ColorizeProgress) => void,
  signal: AbortSignal
): Promise<ReadySession> {
  return createSessionForModel("siggraph17", backend, onProgress, signal);
}
