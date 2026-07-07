/**
 * ブラウザ内カラー化パイプライン本体。
 *
 * 1. 元画像から Lab の L（輝度）を抽出
 * 2. 256x256 の L のみをモデルへ入力し、ab（色差）だけを推定させる
 * 3. ab を元解像度へバイリニア拡大し、「元画像の L」と再合成
 * 4. 過剰彩度を抑制し、元画像と同一寸法の RGBA を返す
 *
 * 画像データはこの関数の引数として渡されたメモリ上にのみ存在し、
 * ネットワークへは一切送信されない（fetch するのは同一オリジンの
 * モデル・ランタイムのみ）。
 */

import { ColorizeError, type ColorizeProgress, type ColorizeResult } from "@/lib/colorization/types";
import { rgbaToL, rgbaToGrayPlanarRGB, labToRgba } from "./labColor";
import { upsampleAb, boostChroma, clampChroma, grayStructureMAD } from "./abProcessing";
import {
  MODELS,
  createSessionForModel,
  selectBackend,
  type ColorizeModelId,
  type OrtTensor,
} from "./ortRuntime";

export type ColorizeInput = {
  /** 処理対象画像（EXIF反映・縮小済み）の RGBA。 */
  fullRgba: Uint8ClampedArray;
  width: number;
  height: number;
  /** 同じ画像を 256x256 に縮小した RGBA（標準モデル=siggraph17 用）。 */
  smallRgba: Uint8ClampedArray;
  /** 同じ画像を 512x512 に縮小した RGBA（高品質モデル=DDColor 用・任意）。 */
  largeRgba?: Uint8ClampedArray;
};

/**
 * 仕上がりの色の濃さ（標準モデルのみ有効）。
 * - vivid: chroma をソフトニー付きで増幅（一眼レフ風の色乗り。既定）
 * - soft: モデル出力の控えめな彩度のまま
 * どちらも輝度・形状には影響しない。
 */
export type ColorizeFinish = "vivid" | "soft";

/**
 * カラー化の品質モード。
 * - standard: siggraph17（軽量・高速。256入力）
 * - high: DDColor（人物の肌色・発色が自然。512入力・大きめのモデル）
 */
export type ColorizeQuality = "standard" | "high";

export function modelIdForQuality(quality: ColorizeQuality): ColorizeModelId {
  return quality === "high" ? "ddcolor" : "siggraph17";
}

export type ColorizeOutput = ColorizeResult & {
  /** 元画像と同一寸法の結果 RGBA（ImageData 化は呼び出し側で行う）。 */
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
};

/** 結果と元画像の輝度構造差がこの値（L 0-100 スケール）を超えたら警告を付ける。 */
export const GRAY_STRUCTURE_WARN_THRESHOLD = 1.0;

export function newClientSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `cs-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
}

function throwIfAborted(signal: AbortSignal, sessionId: string): void {
  if (signal.aborted) throw new ColorizeError("PROCESS_CANCELLED", sessionId);
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function looksLikeOom(err: unknown): boolean {
  if (err instanceof RangeError) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("memory") || msg.includes("allocation") || msg.includes("oom");
}

function looksLikeNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("http ") ||
    msg.includes("load failed") ||
    msg.includes("dynamically imported module")
  );
}

/** 例外を利用者向けエラーコードへ分類する。 */
export function classifyError(
  err: unknown,
  phase: "session" | "inference" | "composite",
  sessionId: string
): ColorizeError {
  if (err instanceof ColorizeError) return err;
  if (isAbortError(err)) return new ColorizeError("PROCESS_CANCELLED", sessionId, err);
  if (looksLikeOom(err)) return new ColorizeError("OUT_OF_MEMORY", sessionId, err);
  if (phase === "session") {
    if (looksLikeNetworkError(err)) return new ColorizeError("MODEL_DOWNLOAD_FAILED", sessionId, err);
    return new ColorizeError("MODEL_INITIALIZATION_FAILED", sessionId, err);
  }
  if (phase === "inference") return new ColorizeError("COLORIZATION_FAILED", sessionId, err);
  return new ColorizeError("INTERNAL_ERROR", sessionId, err);
}

/** ブラウザがブラウザ内推論の前提（WebAssembly）を満たすか。 */
export function isBrowserSupported(win: { WebAssembly?: unknown } = window): boolean {
  return typeof win.WebAssembly === "object" && win.WebAssembly !== null;
}

export async function colorizeInBrowser(
  input: ColorizeInput,
  options: {
    signal: AbortSignal;
    onProgress?: (p: ColorizeProgress) => void;
    clientSessionId?: string;
    finish?: ColorizeFinish;
    quality?: ColorizeQuality;
  }
): Promise<ColorizeOutput> {
  const sessionId = options.clientSessionId ?? newClientSessionId();
  const onProgress = options.onProgress ?? (() => {});
  const { signal } = options;
  const { width, height } = input;
  const pixelCount = width * height;

  const quality: ColorizeQuality = options.quality ?? "standard";
  const modelId = modelIdForQuality(quality);
  const model = MODELS[modelId];
  const size = model.inputSize;
  const modelPixels = size * size;

  if (!isBrowserSupported()) {
    throw new ColorizeError("UNSUPPORTED_BROWSER", sessionId);
  }
  // モデル入力サイズに合致した縮小RGBAを選ぶ（256=smallRgba / 512=largeRgba）
  const modelRgba = size === 256 ? input.smallRgba : input.largeRgba;
  if (
    input.fullRgba.length !== pixelCount * 4 ||
    !modelRgba ||
    modelRgba.length !== modelPixels * 4
  ) {
    throw new ColorizeError("INTERNAL_ERROR", sessionId, new Error("input size mismatch"));
  }
  throwIfAborted(signal, sessionId);

  // --- 輝度抽出（元画像の L は最後まで保持し、そのまま結果に使う） ---
  const lFull = rgbaToL(input.fullRgba, pixelCount);
  // モデル入力テンソル（L 1ch もしくは グレーRGB 3ch）
  const feed: Float32Array =
    model.inputKind === "L" ? rgbaToL(modelRgba, modelPixels) : rgbaToGrayPlanarRGB(modelRgba, modelPixels);
  const dims = model.inputKind === "L" ? [1, 1, size, size] : [1, 3, size, size];
  throwIfAborted(signal, sessionId);

  // --- セッション準備（WebGPU 失敗時は WASM へ自動フォールバック） ---
  let ready;
  const preferred = selectBackend();
  try {
    ready = await createSessionForModel(modelId, preferred, onProgress, signal);
  } catch (err) {
    if (isAbortError(err) || signal.aborted) throw new ColorizeError("PROCESS_CANCELLED", sessionId, err);
    if (preferred === "webgpu") {
      try {
        ready = await createSessionForModel(modelId, "wasm", onProgress, signal);
      } catch (err2) {
        throw classifyError(err2, "session", sessionId);
      }
    } else {
      throw classifyError(err, "session", sessionId);
    }
  }
  throwIfAborted(signal, sessionId);

  // --- 推論（入力は輝度/グレーのみ・出力は ab のみ） ---
  onProgress({ stage: "inferring", backend: ready.backend });
  const t0 = performance.now();
  let abData: Float32Array;
  try {
    const inputTensor = new ready.ort.Tensor("float32", feed, dims);
    const outputs = await ready.session.run({ [ready.model.inputName]: inputTensor });
    const out: OrtTensor | undefined =
      outputs.output_ab ?? outputs.output ?? Object.values(outputs)[0];
    if (!out || !(out.data instanceof Float32Array)) {
      throw new Error("unexpected model output");
    }
    abData = out.data;
  } catch (err) {
    throw classifyError(err, "inference", sessionId);
  }
  const inferMs = performance.now() - t0;
  throwIfAborted(signal, sessionId);

  // --- 再合成（元画像の L + 推定 ab、寸法は元画像と完全一致） ---
  onProgress({ stage: "compositing" });
  const t1 = performance.now();
  let rgba: Uint8ClampedArray;
  let mad: number;
  const warnings: string[] = [];
  try {
    const { a, b } = upsampleAb(abData, size, width, height);
    // DDColor(高品質)は既に十分に鮮やかなため vivid 増幅は行わない。
    // 標準(siggraph17)のみ vivid で色乗りを補う。
    if (quality === "standard" && (options.finish ?? "vivid") === "vivid") {
      boostChroma(a, b, pixelCount);
    }
    clampChroma(a, b, pixelCount);
    rgba = new Uint8ClampedArray(pixelCount * 4);
    labToRgba(lFull, a, b, rgba, pixelCount);

    const lResult = rgbaToL(rgba, pixelCount);
    mad = grayStructureMAD(lFull, lResult, pixelCount);
    if (mad > GRAY_STRUCTURE_WARN_THRESHOLD) {
      warnings.push("structure_diff");
    }
  } catch (err) {
    throw classifyError(err, "composite", sessionId);
  }
  const compositeMs = performance.now() - t1;

  return {
    rgba,
    width,
    height,
    backend: ready.backend,
    clientSessionId: sessionId,
    timings: {
      modelDownloadMs: ready.modelDownloadMs,
      initMs: ready.initMs,
      inferMs,
      compositeMs,
    },
    grayStructureMAD: mad,
    warnings,
  };
}
