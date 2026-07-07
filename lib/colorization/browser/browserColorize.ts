/**
 * ブラウザ内カラー化パイプライン本体。
 *
 * 1. コラージュ検出 → タイル分割カラー化（分割が見つかった場合）
 * 2. 元画像から Lab の L（輝度）を抽出
 * 3. 256x256 または 512x512 をモデルへ入力し ab（色差）を推定
 * 4. 品質チェック → ほぼ白黒なら別モデルで内部再試行
 * 5. ab を元解像度へバイリニア拡大し「元画像の L」と再合成
 * 6. 2候補（自然 / あざやか）を生成し UI で選択可能にする
 *
 * 画像データはブラウザメモリ内にのみ存在し、外部へ送信されない。
 */

import { ColorizeError, type ColorizeProgress, type ColorizeResult } from "@/lib/colorization/types";
import { rgbaToL, rgbaToGrayPlanarRGB, labToRgba } from "./labColor";
import {
  upsampleAb,
  boostChroma,
  clampChroma,
  grayStructureMAD,
  meanChroma,
  removeCast,
  CHROMA_QUALITY_THRESHOLD,
} from "./abProcessing";
import { claheRgba } from "./clahe";
import {
  MODELS,
  createSessionForModel,
  selectBackend,
  type ColorizeModelId,
  type OrtTensor,
  type ReadySession,
} from "./ortRuntime";
import {
  detectHorizontalSplits,
  splitIntoTiles,
  stitchAbChannels,
  type CollageTile,
} from "./collage";

export type ColorizeInput = {
  fullRgba: Uint8ClampedArray;
  width: number;
  height: number;
  /** 同じ画像を 256x256 に縮小した RGBA（標準モデル=siggraph17 用）。 */
  smallRgba: Uint8ClampedArray;
  /** 同じ画像を 512x512 に縮小した RGBA（高品質モデル=DDColor 用・任意）。 */
  largeRgba?: Uint8ClampedArray;
};

/**
 * 仕上がりの色の濃さ（標準モデルでの候補1に影響）。
 * - vivid: chroma をソフトニー付きで増幅（一眼レフ風。既定）
 * - soft: モデル出力の控えめな彩度のまま
 */
export type ColorizeFinish = "vivid" | "soft";

/**
 * カラー化の品質モード。
 * - standard: siggraph17（軽量・高速。256入力）
 * - high: DDColor（人物の肌色・発色が自然。512入力）
 */
export type ColorizeQuality = "standard" | "high";

export function modelIdForQuality(quality: ColorizeQuality): ColorizeModelId {
  return quality === "high" ? "ddcolor" : "siggraph17";
}

export type ColorizeOutput = ColorizeResult & {
  /** 元画像と同一寸法の結果 RGBA（候補1: 自然 / standard+soft の場合は通常仕上がり）。 */
  rgba: Uint8ClampedArray;
  /**
   * 候補2（あざやか）。高品質モードでは vivid boost 適用版。
   * standard モードでは rgba と同一（finish 切替がすでに候補の役割を果たすため）。
   */
  vividRgba?: Uint8ClampedArray;
  width: number;
  height: number;
  /** 内部再試行が発生した場合に記録するモデル名（ログ用）。 */
  retriedWith?: string;
  /** コラージュ分割枚数（0 = 通常処理、1以上 = タイル数）。 */
  collageTiles?: number;
};

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

export function isBrowserSupported(win: { WebAssembly?: unknown } = window): boolean {
  return typeof win.WebAssembly === "object" && win.WebAssembly !== null;
}

// ---- タイル単位の推論 ----

type TileAbResult = {
  a: Float32Array;
  b: Float32Array;
  retriedWith?: string;
};

/**
 * 1タイル分の推論を実行して ab チャンネルを返す。
 * 品質チェック → ほぼ白黒なら別モデルで内部再試行する。
 */
async function inferTileAb(
  tile: Pick<CollageTile, "fullRgba" | "smallRgba" | "largeRgba" | "width" | "height">,
  modelId: ColorizeModelId,
  ready: ReadySession,
  onProgress: (p: ColorizeProgress) => void,
  signal: AbortSignal,
  sessionId: string
): Promise<TileAbResult> {
  const model = MODELS[modelId];
  const size = model.inputSize;
  const modelRgba = size === 256 ? tile.smallRgba : tile.largeRgba;
  if (!modelRgba || modelRgba.length !== size * size * 4) {
    throw new ColorizeError("INTERNAL_ERROR", sessionId, new Error("tile rgba size mismatch"));
  }

  // CLAHE: 古い退色写真の局所コントラストを強化してモデルの色推定精度を向上させる。
  // タイルサイズ = size/8 で常に 8×8 タイルになるよう自動調整。
  const enhancedRgba = claheRgba(modelRgba, size, size, Math.round(size / 8));
  const feed =
    model.inputKind === "L"
      ? rgbaToL(enhancedRgba, size * size)
      : rgbaToGrayPlanarRGB(enhancedRgba, size * size);
  const dims = model.inputKind === "L" ? [1, 1, size, size] : [1, 3, size, size];
  const tensor = new (ready.ort.Tensor as new (t: string, d: Float32Array, dims: number[]) => OrtTensor)(
    "float32",
    feed,
    dims
  );
  const outputs = await ready.session.run({ [model.inputName]: tensor });
  const out: OrtTensor | undefined =
    outputs.output_ab ?? outputs.output ?? Object.values(outputs)[0];
  if (!out || !(out.data instanceof Float32Array)) {
    throw new Error("unexpected model output");
  }
  const { a, b } = upsampleAb(out.data, size, tile.width, tile.height);

  // 品質チェック: ほぼ白黒 → 別モデルで内部再試行
  const chroma = meanChroma(a, b, tile.width * tile.height);
  if (chroma >= CHROMA_QUALITY_THRESHOLD) {
    return { a, b };
  }

  const retryModelId: ColorizeModelId = modelId === "ddcolor" ? "siggraph17" : "ddcolor";
  console.info(
    `[colorize] gray output (chroma=${chroma.toFixed(2)}) with ${modelId}, retrying with ${retryModelId}`
  );
  throwIfAborted(signal, sessionId);

  const preferred = selectBackend();
  let retryReady: ReadySession | null = null;
  try {
    retryReady = await createSessionForModel(retryModelId, preferred, onProgress, signal);
  } catch {
    try {
      retryReady = await createSessionForModel(retryModelId, "wasm", onProgress, signal);
    } catch (e) {
      console.warn(`[colorize] retry session init failed:`, e);
      return { a, b, retriedWith: `${retryModelId}:session_failed` };
    }
  }

  const retryModel = MODELS[retryModelId];
  const retrySize = retryModel.inputSize;
  const retryRgba = retrySize === 256 ? tile.smallRgba : tile.largeRgba;
  if (!retryRgba || retryRgba.length !== retrySize * retrySize * 4) {
    return { a, b, retriedWith: `${retryModelId}:no_rgba` };
  }
  const retryEnhanced = claheRgba(retryRgba, retrySize, retrySize, Math.round(retrySize / 8));
  const retryFeed =
    retryModel.inputKind === "L"
      ? rgbaToL(retryEnhanced, retrySize * retrySize)
      : rgbaToGrayPlanarRGB(retryEnhanced, retrySize * retrySize);
  const retryDims = retryModel.inputKind === "L" ? [1, 1, retrySize, retrySize] : [1, 3, retrySize, retrySize];
  try {
    const retryTensor = new (retryReady.ort.Tensor as new (t: string, d: Float32Array, dims: number[]) => OrtTensor)(
      "float32",
      retryFeed,
      retryDims
    );
    const retryOutputs = await retryReady.session.run({ [retryModel.inputName]: retryTensor });
    const retryOut: OrtTensor | undefined =
      retryOutputs.output_ab ?? retryOutputs.output ?? Object.values(retryOutputs)[0];
    if (retryOut && retryOut.data instanceof Float32Array) {
      const { a: ra, b: rb } = upsampleAb(retryOut.data, retrySize, tile.width, tile.height);
      if (meanChroma(ra, rb, tile.width * tile.height) >= CHROMA_QUALITY_THRESHOLD) {
        return { a: ra, b: rb, retriedWith: retryModelId };
      }
    }
  } catch (e) {
    console.warn(`[colorize] retry inference failed:`, e);
  }
  // 両方失敗 → 元の結果で続行（エラーにはせず最善を返す）
  return { a, b, retriedWith: `${retryModelId}:still_gray` };
}

// ---- メイン ----

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

  if (!isBrowserSupported()) throw new ColorizeError("UNSUPPORTED_BROWSER", sessionId);

  const modelRgba = size === 256 ? input.smallRgba : input.largeRgba;
  if (
    input.fullRgba.length !== pixelCount * 4 ||
    !modelRgba ||
    modelRgba.length !== size * size * 4
  ) {
    throw new ColorizeError("INTERNAL_ERROR", sessionId, new Error("input size mismatch"));
  }
  throwIfAborted(signal, sessionId);

  // 元画像の輝度（最後まで保持し結果に使う）
  const lFull = rgbaToL(input.fullRgba, pixelCount);
  throwIfAborted(signal, sessionId);

  // セッション準備（WebGPU 失敗 → WASM 自動フォールバック）
  let ready: ReadySession;
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

  onProgress({ stage: "inferring", backend: ready.backend });

  // コラージュ検出
  const standardSize = MODELS.siggraph17.inputSize;
  const highSize = MODELS.ddcolor.inputSize;
  const collageSplits = detectHorizontalSplits(input.fullRgba, width, height);

  let aMerged: Float32Array;
  let bMerged: Float32Array;
  let retriedWith: string | undefined;
  let collageTiles = 0;
  const t0 = performance.now();

  try {
    if (collageSplits.length > 0) {
      collageTiles = collageSplits.length + 1;
      const tiles = splitIntoTiles(input.fullRgba, width, height, collageSplits, standardSize, highSize);
      const results: { a: Float32Array; b: Float32Array; width: number; height: number }[] = [];
      for (const tile of tiles) {
        throwIfAborted(signal, sessionId);
        const r = await inferTileAb(tile, modelId, ready, onProgress, signal, sessionId);
        if (r.retriedWith && !retriedWith) retriedWith = r.retriedWith;
        results.push({ a: r.a, b: r.b, width: tile.width, height: tile.height });
      }
      const merged = stitchAbChannels(results, width, height);
      aMerged = merged.a;
      bMerged = merged.b;
    } else {
      const r = await inferTileAb(
        { fullRgba: input.fullRgba, smallRgba: input.smallRgba, largeRgba: input.largeRgba ?? new Uint8ClampedArray(0), width, height },
        modelId,
        ready,
        onProgress,
        signal,
        sessionId
      );
      aMerged = r.a;
      bMerged = r.b;
      retriedWith = r.retriedWith;
    }
  } catch (err) {
    throw classifyError(err, "inference", sessionId);
  }

  const inferMs = performance.now() - t0;
  throwIfAborted(signal, sessionId);

  // 再合成（元画像の L + 推定 ab）
  onProgress({ stage: "compositing" });
  const t1 = performance.now();
  let rgba: Uint8ClampedArray;
  let vividRgba: Uint8ClampedArray | undefined;
  let mad: number;
  const warnings: string[] = [];

  try {
    // 色かぶり補正: モデルが旧写真に対して出しやすい暖色バイアスを半減させる。
    // sliceの前に in-place で適用することで全候補が補正後の ab から派生する。
    removeCast(aMerged, bMerged, pixelCount);

    // 候補1: 自然 / standard+soft の場合はそのまま
    const aN = aMerged.slice(0);
    const bN = bMerged.slice(0);
    if (quality === "standard" && (options.finish ?? "vivid") === "vivid") {
      boostChroma(aN, bN, pixelCount);
    }
    clampChroma(aN, bN, pixelCount);
    rgba = new Uint8ClampedArray(pixelCount * 4);
    labToRgba(lFull, aN, bN, rgba, pixelCount);

    // 候補2: あざやか（high quality でのみ別候補として提供）
    if (quality === "high") {
      const aV = aMerged.slice(0);
      const bV = bMerged.slice(0);
      boostChroma(aV, bV, pixelCount);
      clampChroma(aV, bV, pixelCount);
      vividRgba = new Uint8ClampedArray(pixelCount * 4);
      labToRgba(lFull, aV, bV, vividRgba, pixelCount);
    }

    const lResult = rgbaToL(rgba, pixelCount);
    mad = grayStructureMAD(lFull, lResult, pixelCount);
    if (mad > GRAY_STRUCTURE_WARN_THRESHOLD) warnings.push("structure_diff");
  } catch (err) {
    throw classifyError(err, "composite", sessionId);
  }
  const compositeMs = performance.now() - t1;

  return {
    rgba,
    vividRgba,
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
    retriedWith,
    collageTiles: collageTiles > 0 ? collageTiles : undefined,
  };
}
