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
