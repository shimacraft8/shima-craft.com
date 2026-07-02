/**
 * sRGB(D65) ↔ CIE Lab 変換。
 * カラー化では「元画像の L（輝度）を最終結果へそのまま再利用する」ことで
 * 輪郭・構図・顔の形状を完全に保持する。ここの変換はその要になる純関数群。
 */

const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;
const EPS = 0.008856; // (6/29)^3
const KAPPA_INV = 7.787; // 1/3 * (29/6)^2

export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function fLab(t: number): number {
  return t > EPS ? Math.cbrt(t) : KAPPA_INV * t + 16 / 116;
}

function fLabInv(t: number): number {
  const t3 = t * t * t;
  return t3 > EPS ? t3 : (t - 16 / 116) / KAPPA_INV;
}

/**
 * RGBA ピクセル列から L チャンネル (0..100) を抽出する。
 * @param rgba RGBA順の画素データ（ImageData.data 互換）
 * @param pixelCount ピクセル数
 */
export function rgbaToL(rgba: Uint8ClampedArray, pixelCount: number): Float32Array {
  const L = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = srgbToLinear(rgba[i * 4] / 255);
    const g = srgbToLinear(rgba[i * 4 + 1] / 255);
    const b = srgbToLinear(rgba[i * 4 + 2] / 255);
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    L[i] = 116 * fLab(y / YN) - 16;
  }
  return L;
}

/**
 * L (0..100) と ab を RGBA へ再合成して out に書き込む。
 * L は元画像由来のものを渡すこと（モデル出力で置き換えない）。
 */
export function labToRgba(
  L: Float32Array,
  a: Float32Array,
  b: Float32Array,
  out: Uint8ClampedArray,
  pixelCount: number
): void {
  for (let i = 0; i < pixelCount; i++) {
    const fy = (L[i] + 16) / 116;
    const fx = fy + a[i] / 500;
    const fz = fy - b[i] / 200;
    const x = XN * fLabInv(fx);
    const y = YN * fLabInv(fy);
    const z = ZN * fLabInv(fz);
    let r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    let g = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
    let bb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
    r = r < 0 ? 0 : r > 1 ? 1 : r;
    g = g < 0 ? 0 : g > 1 ? 1 : g;
    bb = bb < 0 ? 0 : bb > 1 ? 1 : bb;
    out[i * 4] = Math.round(linearToSrgb(r) * 255);
    out[i * 4 + 1] = Math.round(linearToSrgb(g) * 255);
    out[i * 4 + 2] = Math.round(linearToSrgb(bb) * 255);
    out[i * 4 + 3] = 255;
  }
}
