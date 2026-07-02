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
