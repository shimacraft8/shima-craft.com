/**
 * モデルが推定した ab（色差）チャンネルの後処理。
 * - モデル解像度(256x256)から元画像解像度へのバイリニア拡大
 * - 過剰彩度の抑制（chroma clamp）
 * いずれも L（輝度）には一切触れない。
 */

export type AbChannels = { a: Float32Array; b: Float32Array };

/**
 * (2, size, size) 平面連続配列の ab を targetW×targetH へバイリニア拡大する。
 * @param ab モデル出力（a平面 size*size 個 → b平面 size*size 個 の順）
 */
export function upsampleAb(
  ab: Float32Array,
  size: number,
  targetW: number,
  targetH: number
): AbChannels {
  const a = new Float32Array(targetW * targetH);
  const b = new Float32Array(targetW * targetH);
  const planeB = size * size;
  for (let y = 0; y < targetH; y++) {
    // 画像端では sy/sx が [0, size-1] を外れ補間重みが負になる（外挿）ため、範囲内へクランプする
    const sy = Math.min(size - 1, Math.max(0, ((y + 0.5) * size) / targetH - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(size - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(size - 1, Math.max(0, ((x + 0.5) * size) / targetW - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(size - 1, x0 + 1);
      const wx = sx - x0;
      const w00 = (1 - wy) * (1 - wx);
      const w01 = (1 - wy) * wx;
      const w10 = wy * (1 - wx);
      const w11 = wy * wx;
      const i00 = y0 * size + x0;
      const i01 = y0 * size + x1;
      const i10 = y1 * size + x0;
      const i11 = y1 * size + x1;
      const o = y * targetW + x;
      a[o] = ab[i00] * w00 + ab[i01] * w01 + ab[i10] * w10 + ab[i11] * w11;
      b[o] = ab[planeB + i00] * w00 + ab[planeB + i01] * w01 + ab[planeB + i10] * w10 + ab[planeB + i11] * w11;
    }
  }
  return { a, b };
}

export const DEFAULT_MAX_CHROMA = 60;
/** 「あざやか」仕上がりの chroma 増幅率。1.45 は実写比較で選定（一眼レフ風の色乗りと自然さの均衡点）。 */
export const VIVID_CHROMA_GAIN = 1.45;
/** ソフトニーの開始 chroma。これ以上は tanh で滑らかに圧縮し、過飽和・色つぶれを防ぐ。 */
export const VIVID_CHROMA_KNEE = 42;

/**
 * chroma をソフトニー付きで増幅する（「あざやか」仕上がり）。
 * L（輝度）には触れないため構造は変化しない。色相も保存される。
 * knee 以下は線形に gain 倍、超過分は tanh で max へ漸近させる。
 */
export function boostChroma(
  a: Float32Array,
  b: Float32Array,
  pixelCount: number,
  gain: number = VIVID_CHROMA_GAIN,
  knee: number = VIVID_CHROMA_KNEE,
  maxChroma: number = DEFAULT_MAX_CHROMA
): void {
  const range = maxChroma - knee;
  for (let i = 0; i < pixelCount; i++) {
    const c = Math.hypot(a[i], b[i]);
    if (c < 1e-6) continue;
    const boosted = c * gain;
    const compressed = boosted <= knee ? boosted : knee + range * Math.tanh((boosted - knee) / range);
    const s = compressed / c;
    a[i] *= s;
    b[i] *= s;
  }
}

/**
 * chroma (√(a²+b²)) が maxChroma を超える画素を等比で縮めて過剰彩度・色にじみを抑える。
 * @returns クランプした画素数
 */
export function clampChroma(
  a: Float32Array,
  b: Float32Array,
  pixelCount: number,
  maxChroma: number = DEFAULT_MAX_CHROMA
): number {
  let clamped = 0;
  for (let i = 0; i < pixelCount; i++) {
    const c = Math.hypot(a[i], b[i]);
    if (c > maxChroma) {
      const s = maxChroma / c;
      a[i] *= s;
      b[i] *= s;
      clamped++;
    }
  }
  return clamped;
}

/** mean chroma √(a²+b²) 全画素平均。4未満ならほぼ白黒の失敗出力とみなす。 */
export function meanChroma(a: Float32Array, b: Float32Array, pixelCount: number): number {
  let sum = 0;
  for (let i = 0; i < pixelCount; i++) sum += Math.hypot(a[i], b[i]);
  return sum / pixelCount;
}

/** mean chroma がこの値未満なら「ほぼ白黒のまま」として失敗判定する */
export const CHROMA_QUALITY_THRESHOLD = 4.0;

/**
 * 色相集中度: ab ベクトル和の大きさ / chroma 総和。[0, 1]。
 * 1.0 = 全画素が同一色相（セピア一色に染まった失敗出力の特徴）、
 * 0 付近 = 色相が多方向に分散（正常なカラー化）。
 * 0.7 超なら「ほぼ単色のかぶり」とみなし、色かぶり補正を強化する判断材料に使う。
 */
export function hueConcentration(a: Float32Array, b: Float32Array, pixelCount: number): number {
  let sumA = 0;
  let sumB = 0;
  let sumC = 0;
  for (let i = 0; i < pixelCount; i++) {
    sumA += a[i];
    sumB += b[i];
    sumC += Math.hypot(a[i], b[i]);
  }
  if (sumC < 1e-6) return 0;
  return Math.min(1, Math.hypot(sumA, sumB) / sumC);
}

/** hueConcentration がこの値を超えたら単色かぶりと判定し removeCastAdaptive を強モードにする */
export const HUE_CONCENTRATION_CAST_THRESHOLD = 0.7;

/**
 * 色かぶり補正: 全画素の ab 平均を計算し、その fraction だけ ab を中立方向へシフトする。
 * DDColor などのモデルが旧写真に対して出しやすい暖色バイアス（b が正方向に偏る）を除去する。
 * L（輝度）は一切変更しない。
 *
 * @param strength 0=補正なし、1=完全に中立化。0.5 が推奨（過補正を防ぎつつバイアスを半減）。
 */
export function removeCast(
  a: Float32Array,
  b: Float32Array,
  pixelCount: number,
  strength = 0.5
): void {
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < pixelCount; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const shiftA = (sumA / pixelCount) * strength;
  const shiftB = (sumB / pixelCount) * strength;
  for (let i = 0; i < pixelCount; i++) {
    a[i] -= shiftA;
    b[i] -= shiftB;
  }
}

/**
 * 輝度適応型の色かぶり補正。グローバルな暖色バイアスを輝度に応じた強度で除去する。
 *
 * 均一な strength=0.5 の removeCast と異なり、明るい画素ほど強く補正する:
 * - 暗部 (L < shadowL): shadowStrength（弱め。影は暖色になりうる）
 * - 中間調 (L = 50 前後): 中間強度
 * - 明部 (L > highlightL): highlightStrength（強め。白い布・明るい背景は中立に近いはず）
 *
 * @param shadowStrength  暗部（L≤shadowL）に適用する補正強度。デフォルト 0.3
 * @param highlightStrength 明部（L≥highlightL）に適用する補正強度。デフォルト 0.85
 */
export function removeCastAdaptive(
  a: Float32Array,
  b: Float32Array,
  L: Float32Array,
  pixelCount: number,
  shadowStrength = 0.3,
  highlightStrength = 0.85,
  shadowL = 20,
  highlightL = 80
): void {
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < pixelCount; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const castA = sumA / pixelCount;
  const castB = sumB / pixelCount;
  const strengthRange = highlightStrength - shadowStrength;
  const lRange = highlightL - shadowL;

  for (let i = 0; i < pixelCount; i++) {
    const t = Math.max(0, Math.min(1, (L[i] - shadowL) / lRange));
    const strength = shadowStrength + t * strengthRange;
    a[i] -= castA * strength;
    b[i] -= castB * strength;
  }
}

/** normalizeChroma の目標 mean chroma。自然なカラー写真の下限程度（実写平均は 12-18）。 */
export const CHROMA_NORMALIZE_TARGET = 11;
/** normalizeChroma の増幅上限。ノイズの過剰増幅と不自然な発色を防ぐ。 */
export const CHROMA_NORMALIZE_MAX_GAIN = 1.8;

/**
 * 彩度正規化: mean chroma が目標を下回る場合、差分を等比で増幅して色分離を回復する。
 *
 * 色かぶり補正（removeCastAdaptive）で ab 分布を中立へセンタリングした後に適用する前提。
 * センタリング後の増幅は「全体を派手にする」のではなく「肌・布・背景などの
 * 色相差を拡大する」効果になるため、セピアに潰れた出力の色分離が改善する。
 * mean chroma が既に目標以上の出力（うまくカラー化できたケース）には何もしない。
 *
 * @returns 適用した gain（1.0 = 変更なし）
 */
export function normalizeChroma(
  a: Float32Array,
  b: Float32Array,
  pixelCount: number,
  target: number = CHROMA_NORMALIZE_TARGET,
  maxGain: number = CHROMA_NORMALIZE_MAX_GAIN
): number {
  const m = meanChroma(a, b, pixelCount);
  // ほぼ無彩色（失敗出力）は増幅してもノイズしか出ないため対象外
  if (m < 1.5 || m >= target) return 1;
  const gain = Math.min(maxGain, target / m);
  boostChroma(a, b, pixelCount, gain);
  return gain;
}

/**
 * シャドウ保護: 暗い画素の彩度を輝度に応じて低減する。
 *
 * 旧写真の深い影にモデルが乗せがちな赤茶色の濁りを防ぐ。
 * 現実の深い影はほぼ無彩色のため、L=threshold で係数 1.0、L=0 で係数 0.0 に線形フェード。
 * threshold 超の画素には一切触れない。
 *
 * @param threshold この輝度値（CIE L、0-100）未満の画素からフェード開始。デフォルト 15
 */
export function protectShadows(
  a: Float32Array,
  b: Float32Array,
  L: Float32Array,
  pixelCount: number,
  threshold = 15
): void {
  for (let i = 0; i < pixelCount; i++) {
    if (L[i] < threshold) {
      const factor = L[i] / threshold;
      a[i] *= factor;
      b[i] *= factor;
    }
  }
}

/**
 * ハイライト保護: 明るい画素の彩度を輝度に応じて低減する。
 *
 * 白い布・明るい空・明るい背景が黄ばんだり茶色になるのを防ぐ。
 * L=threshold で彩度係数 1.0、L=100 で係数 0.0 に線形フェード。
 * threshold 未満の画素には一切触れない。
 *
 * @param threshold この輝度値（CIE L、0-100）を超えた画素からフェード開始。デフォルト 75
 */
export function protectHighlights(
  a: Float32Array,
  b: Float32Array,
  L: Float32Array,
  pixelCount: number,
  threshold = 75
): void {
  const range = 100 - threshold;
  for (let i = 0; i < pixelCount; i++) {
    if (L[i] > threshold) {
      const factor = (100 - L[i]) / range;
      a[i] *= factor;
      b[i] *= factor;
    }
  }
}

/** 元画像 L と結果 L のグレースケール構造差（平均絶対差, L 0-100スケール）。 */
export function grayStructureMAD(
  originalL: Float32Array,
  resultL: Float32Array,
  pixelCount: number
): number {
  let sum = 0;
  for (let i = 0; i < pixelCount; i++) {
    sum += Math.abs(originalL[i] - resultL[i]);
  }
  return sum / pixelCount;
}
