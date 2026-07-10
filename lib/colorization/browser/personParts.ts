/**
 * MediaPipe Image Segmenter（selfie multiclass モデル・Apache-2.0）による人物パーツ分割。
 *
 * 白黒写真から「顔の肌・体の肌・髪・服」を画素単位で分割し、色ヒントの適用範囲を
 * バウンディングボックスより正確にするために使う（記念写真では人物の塗り分け精度が
 * 品質を決める）。背景側の領域（空・樹木など）は従来どおり bbox×輝度帯で扱う。
 *
 * 推論はすべて端末内（ブラウザの WASM）で実行され、画像は外部へ送信されない。
 * ランタイム（/mediapipe/）・モデル（/models/*.tflite）とも同一オリジンから配信する。
 *
 * 失敗してもカラー化は続行する（パーツ分割なし＝bbox のみで動作）。
 */

import type { PersonPartsMask } from "../colorHints";
import type { ImageSegmenter } from "@mediapipe/tasks-vision";

/** selfie multiclass モデルのクラスID */
export const PART_BACKGROUND = 0;
export const PART_HAIR = 1;
export const PART_BODY_SKIN = 2;
export const PART_FACE_SKIN = 3;
export const PART_CLOTHES = 4;
/** アクセサリ・帽子・ゴーグルなど身に付けたその他の物 */
export const PART_OTHERS = 5;

/** 分割に使う入力の長辺上限。マスクは後段でガイデッドフィルタされるためこれで十分 */
const SEGMENT_MAX_DIM = 512;

/**
 * 初期化＋推論全体のタイムアウト。WASM/モデルの読み込みが不調でも
 * カラー化の開始をこれ以上ブロックしない（超過時はパーツ分割なしで続行）。
 */
const SEGMENT_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("segmentation timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

let segmenterPromise: Promise<ImageSegmenter> | null = null;

/** ImageSegmenter を遅延生成してキャッシュする（初回のみ WASM+モデルをダウンロード） */
function loadSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/models/selfie_multiclass_256x256.tflite" },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })();
    // 失敗した初期化をキャッシュしない（ネットワーク一時障害後に再試行できるように）
    segmenterPromise.catch(() => {
      segmenterPromise = null;
    });
  }
  return segmenterPromise;
}

/**
 * RGBA 画像から人物パーツのクラスマップを得る。
 * 失敗時は null（呼び出し側はパーツ分割なしで続行する）。
 */
export async function segmentPersonParts(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Promise<PersonPartsMask | null> {
  try {
    const segmenter = await withTimeout(loadSegmenter(), SEGMENT_TIMEOUT_MS);

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return null;
    srcCtx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);

    const scale = Math.min(1, SEGMENT_MAX_DIM / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);

    const result = segmenter.segment(canvas);
    try {
      const mask = result.categoryMask;
      if (!mask) return null;
      const data = mask.getAsUint8Array();
      return { data: new Uint8Array(data), width: mask.width, height: mask.height };
    } finally {
      result.close();
    }
  } catch (err) {
    console.warn("[colorize] person parts segmentation failed:", err);
    return null;
  }
}
