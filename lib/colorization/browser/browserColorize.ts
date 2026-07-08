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
  hueConcentration,
  luminancePercentile,
  normalizeChroma,
  removeCastAdaptive,
  protectShadows,
  protectHighlights,
  CHROMA_QUALITY_THRESHOLD,
  HUE_CONCENTRATION_CAST_THRESHOLD,
} from "./abProcessing";
import { claheRgba, denoiseIfGrainy, stretchLevels } from "./clahe";
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
  detectVerticalSplits,
  splitIntoTiles,
  stitchAbChannels,
  type CollageAxis,
  type CollageTile,
} from "./collage";
import { applyColorHints, type ColorHintPayload } from "../colorHints";

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

/**
 * 再生成バリエーション: 「同じ画像でもう一度試す」のたびに設定を変えて別の仕上がりを出す。
 *
 * ONNX 推論は決定論的なため、同一入力・同一設定では毎回ピクセル単位で同じ結果になる。
 * 試行回数（attempt）に応じてモデル・CLAHE・色かぶり補正強度を切り替えることで、
 * 再生成のたびに実際に異なる候補を提示する。4 パターンで循環する。
 */
export type PipelineVariant = {
  modelId: ColorizeModelId;
  /** CLAHE の clipLimit。null = CLAHE を適用しない */
  claheClip: number | null;
  /** 色かぶり補正のプロファイル */
  castProfile: "adaptive" | "strong";
};

export function variantForAttempt(quality: ColorizeQuality, attempt: number): PipelineVariant {
  const idx = ((attempt % 4) + 4) % 4;
  if (quality === "high") {
    // 高品質: モデル切替（ddcolor⇔siggraph17）が最も見た目が変わる
    const table: PipelineVariant[] = [
      { modelId: "ddcolor", claheClip: 2.0, castProfile: "adaptive" },
      { modelId: "siggraph17", claheClip: 2.0, castProfile: "adaptive" },
      { modelId: "ddcolor", claheClip: null, castProfile: "strong" },
      { modelId: "siggraph17", claheClip: null, castProfile: "strong" },
    ];
    return table[idx];
  }
  // 標準: 大きいモデルの追加ダウンロードを強制しないよう siggraph17 のまま前処理・補正を変える
  const table: PipelineVariant[] = [
    { modelId: "siggraph17", claheClip: 2.0, castProfile: "adaptive" },
    { modelId: "siggraph17", claheClip: null, castProfile: "adaptive" },
    { modelId: "siggraph17", claheClip: 3.5, castProfile: "strong" },
    { modelId: "siggraph17", claheClip: null, castProfile: "strong" },
  ];
  return table[idx];
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
  /** 適用した再生成バリエーション番号（0 = 初回設定。ログ用）。 */
  variant?: number;
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
  sessionId: string,
  claheClip: number | null = 2.0
): Promise<TileAbResult> {
  const model = MODELS[modelId];
  const size = model.inputSize;
  const modelRgba = size === 256 ? tile.smallRgba : tile.largeRgba;
  if (!modelRgba || modelRgba.length !== size * size * 4) {
    throw new ColorizeError("INTERNAL_ERROR", sessionId, new Error("tile rgba size mismatch"));
  }

  // デノイズ: 印刷スキャンの粒状ノイズが検出された場合のみブラー（クリーン画像には no-op）。
  const denoisedRgba = denoiseIfGrainy(modelRgba, size, size);
  // レベル補正: 退色写真の圧縮された輝度レンジを回復（フルレンジ画像には no-op）。
  const leveledRgba = stretchLevels(denoisedRgba, size, size);
  // CLAHE: 古い退色写真の局所コントラストを強化してモデルの色推定精度を向上させる。
  // タイルサイズ = size/8 で常に 8×8 タイルになるよう自動調整。claheClip=null なら無効（バリエーション用）。
  const enhancedRgba =
    claheClip === null ? leveledRgba : claheRgba(leveledRgba, size, size, Math.round(size / 8), claheClip);
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
  const retryDenoised = denoiseIfGrainy(retryRgba, retrySize, retrySize);
  const retryLeveled = stretchLevels(retryDenoised, retrySize, retrySize);
  const retryEnhanced =
    claheClip === null
      ? retryLeveled
      : claheRgba(retryLeveled, retrySize, retrySize, Math.round(retrySize / 8), claheClip);
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
    /** 再生成の試行回数（0 = 初回）。増えるたびに別バリエーションで生成する。 */
    variant?: number;
    /**
     * Claude Vision から取得した色ヒント（会員向け）。
     * 指定されると ONNX 推定後の ab チャンネルをヒント方向へ部分ブレンドする。
     */
    colorHints?: ColorHintPayload | null;
  }
): Promise<ColorizeOutput> {
  const sessionId = options.clientSessionId ?? newClientSessionId();
  const onProgress = options.onProgress ?? (() => {});
  const { signal } = options;
  const { width, height } = input;
  const pixelCount = width * height;

  const quality: ColorizeQuality = options.quality ?? "standard";
  const variant = options.variant ?? 0;
  const pipeline = variantForAttempt(quality, variant);
  const modelId = pipeline.modelId;
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

  // コラージュ検出（上下並び → 左右並びの順に判定）
  const standardSize = MODELS.siggraph17.inputSize;
  const highSize = MODELS.ddcolor.inputSize;
  let collageAxis: CollageAxis = "horizontal";
  let collageSplits = detectHorizontalSplits(input.fullRgba, width, height);
  if (collageSplits.length === 0) {
    const vSplits = detectVerticalSplits(input.fullRgba, width, height);
    if (vSplits.length > 0) {
      collageAxis = "vertical";
      collageSplits = vSplits;
    }
  }

  let aMerged: Float32Array;
  let bMerged: Float32Array;
  let retriedWith: string | undefined;
  let collageTiles = 0;
  const t0 = performance.now();

  try {
    if (collageSplits.length > 0) {
      collageTiles = collageSplits.length + 1;
      const tiles = splitIntoTiles(
        input.fullRgba, width, height, collageSplits, standardSize, highSize, collageAxis
      );
      const results: {
        a: Float32Array; b: Float32Array; width: number; height: number; startX: number; startY: number;
      }[] = [];
      for (const tile of tiles) {
        throwIfAborted(signal, sessionId);
        const r = await inferTileAb(tile, modelId, ready, onProgress, signal, sessionId, pipeline.claheClip);
        if (r.retriedWith && !retriedWith) retriedWith = r.retriedWith;
        results.push({
          a: r.a, b: r.b, width: tile.width, height: tile.height, startX: tile.startX, startY: tile.startY,
        });
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
        sessionId,
        pipeline.claheClip
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
    // 色validity判定: 出力の色相集中度が高い（ほぼ全画素が同一色相＝セピア一色）なら
    // 単色かぶりとみなし、色かぶり補正を自動的に強モードへ引き上げる。
    const concentration = hueConcentration(aMerged, bMerged, pixelCount);
    const strongCast =
      pipeline.castProfile === "strong" || concentration > HUE_CONCENTRATION_CAST_THRESHOLD;

    // 輝度適応型色かぶり補正: 暗部〜明部で強度を連続変化させる。
    // 均一 strength より白い布・空など明るい領域をより強く中立化できる。
    if (strongCast) {
      removeCastAdaptive(aMerged, bMerged, lFull, pixelCount, 0.55, 0.95);
    } else {
      removeCastAdaptive(aMerged, bMerged, lFull, pixelCount);
    }
    // Vision AI 色ヒント適用: 歴史的・文脈的に正確な色へ ONNX 出力を部分的に誘導する。
    // キャスト補正後・彩度正規化前に適用することで、ヒントがグローバルな色空間で有効に機能する。
    if (options.colorHints) {
      applyColorHints(aMerged, bMerged, lFull, pixelCount, width, height, options.colorHints);
    }
    // 彩度正規化: センタリング後の色相差を増幅して肌・布・背景の色分離を回復する。
    // 彩度不足（mean chroma < 11）の出力のみ対象で、既に十分カラフルな出力には作用しない。
    normalizeChroma(aMerged, bMerged, pixelCount);
    // シャドウ保護: 深い影（L<15）の赤茶の濁りを輝度に応じてフェード。
    protectShadows(aMerged, bMerged, lFull, pixelCount);
    // ハイライト保護: 明るい画素の彩度を輝度に応じてフェードし、白い布の黄ばみを防ぐ。
    // 閾値は固定 75 ではなく画像自身の輝度87パーセンタイル（75-90 にクランプ）へ適応させる。
    // 退色プリントは全体が明るく、固定閾値では背景の樹木など実コンテンツまで脱色されるため。
    const highlightThreshold = Math.max(75, Math.min(90, luminancePercentile(lFull, pixelCount, 0.87)));
    protectHighlights(aMerged, bMerged, lFull, pixelCount, highlightThreshold);

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
    variant,
  };
}
