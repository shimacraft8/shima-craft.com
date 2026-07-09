/**
 * Vision AI（Groq / Llama 4）から取得した色ヒントの型定義とブラウザ内適用ロジック。
 *
 * ヒントは ONNX モデルの推定結果（ab チャンネル）を「既知の歴史的・文脈的な正しい色」へ
 * 部分的にブレンドする形で適用する。weight が 0 に近いほど ONNX の結果を尊重し、
 * 大きいほどヒントを強く反映する（上限 MAX_BLEND_WEIGHT）。
 *
 * 適用マスクは「バウンディングボックス × 輝度帯」で粗く作った後、
 * 輝度画像をガイドにしたガイデッドフィルタで物体境界へスナップさせる。
 * これにより矩形の縁が消え、色が実際の物体形状（顔の輪郭・木の枝ぶり等）に沿う。
 *
 * box がない領域は画像全体に作用してセピア一色化を招くため、weight を強制的に
 * 弱める（BOXLESS_WEIGHT_CAP）。
 *
 * L（輝度）は一切変更しない。ab チャンネルのみを操作する。
 */

/** 正規化バウンディングボックス（0〜1。x0<x1, y0<y1） */
export type HintBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** 1つのセマンティック領域に対する色ヒント */
export type ColorRegionHint = {
  /** 領域の名前（ログ・デバッグ用） */
  label: string;
  /** この領域が対象とする輝度の下限（CIE L*、0-100） */
  luminanceMin: number;
  /** この領域が対象とする輝度の上限（CIE L*、0-100） */
  luminanceMax: number;
  /** 目標 CIE a* 値（-50〜50。負=緑方向、正=赤方向） */
  aTarget: number;
  /** 目標 CIE b* 値（-50〜50。負=青方向、正=黄方向） */
  bTarget: number;
  /**
   * ブレンド強度（0〜0.5）。
   * 0 = ONNX 出力そのまま、0.5 = 半分ヒント寄り。
   */
  weight: number;
  /**
   * 領域の空間範囲（正規化 0〜1）。輝度帯とのANDで適用画素を決める。
   * 未指定の場合は画像全体が対象になるため weight が自動的に弱められる。
   */
  box?: HintBox;
};

/** Vision AI が返す色ヒント全体 */
export type ColorHintPayload = {
  /** シーンの説明（ログ・デバッグ用） */
  scene: string;
  /** 各セマンティック領域のヒント配列 */
  regions: ColorRegionHint[];
};

/** box なし領域の weight 上限。空間限定がないヒントは全体ウォッシュになりやすい */
const BOXLESS_WEIGHT_CAP = 0.2;

/** box 縁のフェザー幅（正規化。境界の色の段差を防ぐ） */
const BOX_FEATHER = 0.04;

/** 輝度帯境界のフェザー幅（L* 単位。輝度バンディングを防ぐ） */
const LUM_FEATHER = 4;

/** 最終ブレンド強度の上限。これ以上はヒント色がベタ塗りに見える */
const MAX_BLEND_WEIGHT = 0.6;

/** マスク処理の低解像度上限（長辺）。重みマップは滑らかなので低解像度で十分 */
const MASK_MAX_DIM = 384;

/** ガイデッドフィルタの正則化。小さいほど輝度エッジで強くマスクが切れる（L 0-100 スケールの分散） */
const GUIDED_EPS = 25;

/** これ未満の実効 weight は適用しない（フィルタ裾野のノイズ除去） */
const MIN_EFFECTIVE_WEIGHT = 0.02;

/** 0..1 へのクランプ */
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * 2次元 Float32 マップの移動平均（box filter）。積分画像で O(N)。
 * 画像端はウィンドウを内側へ切り詰めて正規化する。
 */
export function boxFilter(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const out = new Float32Array(w * h);
  const integ = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x];
      integ[(y + 1) * (w + 1) + (x + 1)] = integ[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum =
        integ[(y1 + 1) * (w + 1) + (x1 + 1)] -
        integ[y0 * (w + 1) + (x1 + 1)] -
        integ[(y1 + 1) * (w + 1) + x0] +
        integ[y0 * (w + 1) + x0];
      out[y * w + x] = sum / area;
    }
  }
  return out;
}

/**
 * グレースケールガイデッドフィルタ（He et al. 2010）。
 * ガイド画像 I のエッジを保ちながら入力 p を平滑化する。
 * ここでは輝度 L をガイドに矩形マスクを物体境界へスナップさせる用途で使う。
 */
export function guidedFilter(
  p: Float32Array,
  guide: Float32Array,
  w: number,
  h: number,
  radius: number,
  eps: number
): Float32Array {
  const n = w * h;
  const meanI = boxFilter(guide, w, h, radius);
  const meanP = boxFilter(p, w, h, radius);
  const ip = new Float32Array(n);
  const ii = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    ip[i] = guide[i] * p[i];
    ii[i] = guide[i] * guide[i];
  }
  const meanIP = boxFilter(ip, w, h, radius);
  const meanII = boxFilter(ii, w, h, radius);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = meanII[i] - meanI[i] * meanI[i];
    const covIP = meanIP[i] - meanI[i] * meanP[i];
    a[i] = covIP / (varI + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }
  const meanA = boxFilter(a, w, h, radius);
  const meanB = boxFilter(b, w, h, radius);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = meanA[i] * guide[i] + meanB[i];
  }
  return out;
}

/** Float32 マップのバイリニア拡大（マスク・輝度など単チャンネル用） */
export function bilinearResize(
  src: Float32Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number
): Float32Array {
  if (sw === dw && sh === dh) return src.slice(0);
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.max(0, ((y + 0.5) * sh) / dh - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.max(0, ((x + 0.5) * sw) / dw - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const wx = sx - x0;
      out[y * dw + x] =
        src[y0 * sw + x0] * (1 - wy) * (1 - wx) +
        src[y0 * sw + x1] * (1 - wy) * wx +
        src[y1 * sw + x0] * wy * (1 - wx) +
        src[y1 * sw + x1] * wy * wx;
    }
  }
  return out;
}

/**
 * ONNX モデルが推定した ab チャンネルへ色ヒントを部分適用する。
 *
 * 処理の流れ:
 * 1. 低解像度（長辺 MASK_MAX_DIM）で「bbox × 輝度帯」の粗い重みマップを作る
 *    （premultiplied: W、W×aTarget、W×bTarget の3枚）
 * 2. 輝度をガイドにガイデッドフィルタをかけ、マスクを物体境界へスナップさせる
 * 3. フル解像度へバイリニア拡大し、画素ごとに ab をヒント色へブレンドする
 *
 * @param a          モデル推定後の a チャンネル（in-place 変更）
 * @param b          モデル推定後の b チャンネル（in-place 変更）
 * @param L          元画像の輝度チャンネル（変更しない）
 * @param pixelCount 画素数（a・b・L の有効要素数）
 * @param width      画像の幅（px）
 * @param height     画像の高さ（px）
 * @param hints      Vision AI が返したヒント
 * @param strength   全体強度係数。ONNX 出力がセピア崩壊している時に 1 超を渡して
 *                   ヒント主導にする（browserColorize が hueConcentration から算出）
 */
export function applyColorHints(
  a: Float32Array,
  b: Float32Array,
  L: Float32Array,
  pixelCount: number,
  width: number,
  height: number,
  hints: ColorHintPayload,
  strength = 1
): void {
  const regions = hints.regions.filter((r) => r.weight > 0 && r.luminanceMax > r.luminanceMin);
  if (regions.length === 0 || width <= 0 || height <= 0 || strength <= 0) return;

  // ---- 1. 低解像度の粗い重みマップ ----
  const scale = Math.min(1, MASK_MAX_DIM / Math.max(width, height));
  const mw = Math.max(1, Math.round(width * scale));
  const mh = Math.max(1, Math.round(height * scale));
  const guide = bilinearResize(L, width, height, mw, mh);

  const prepared = regions.map((r) => {
    const cap = r.box ? MAX_BLEND_WEIGHT : BOXLESS_WEIGHT_CAP;
    return {
      lumMin: r.luminanceMin,
      lumMax: r.luminanceMax,
      aTarget: r.aTarget,
      bTarget: r.bTarget,
      weight: Math.min(cap, Math.max(0, r.weight * strength)),
      px0: r.box ? r.box.x0 * mw : 0,
      px1: r.box ? r.box.x1 * mw : mw,
      py0: r.box ? r.box.y0 * mh : 0,
      py1: r.box ? r.box.y1 * mh : mh,
      featherX: BOX_FEATHER * mw,
      featherY: BOX_FEATHER * mh,
    };
  });

  const mn = mw * mh;
  const W = new Float32Array(mn);
  const WA = new Float32Array(mn);
  const WB = new Float32Array(mn);

  for (let i = 0; i < mn; i++) {
    const lv = guide[i];
    const x = i % mw;
    const y = (i - x) / mw;

    let bestW = 0;
    let bestA = 0;
    let bestB = 0;

    for (const region of prepared) {
      // 輝度フェザー: 帯の内側で1、境界±LUM_FEATHERで0へ滑らかに減衰
      const lumIn = Math.min(lv - region.lumMin, region.lumMax - lv);
      if (lumIn <= -LUM_FEATHER) continue;
      const lumFactor = clamp01((lumIn + LUM_FEATHER) / (LUM_FEATHER * 2));
      if (lumFactor <= 0) continue;

      // 空間フェザー: box の内側で1、縁から外へ featherX/Y かけて0へ減衰
      const inX = Math.min(x - region.px0, region.px1 - x);
      const inY = Math.min(y - region.py0, region.py1 - y);
      if (inX <= -region.featherX || inY <= -region.featherY) continue;
      const spatialFactor =
        clamp01((inX + region.featherX) / (region.featherX * 2)) *
        clamp01((inY + region.featherY) / (region.featherY * 2));
      if (spatialFactor <= 0) continue;

      const w = region.weight * lumFactor * spatialFactor;
      if (w > bestW) {
        bestW = w;
        bestA = region.aTarget;
        bestB = region.bTarget;
      }
    }

    W[i] = bestW;
    WA[i] = bestW * bestA;
    WB[i] = bestW * bestB;
  }

  // ---- 2. ガイデッドフィルタで物体境界へスナップ ----
  const radius = Math.max(2, Math.round(Math.min(mw, mh) * 0.03));
  const Wf = guidedFilter(W, guide, mw, mh, radius, GUIDED_EPS);
  const WAf = guidedFilter(WA, guide, mw, mh, radius, GUIDED_EPS);
  const WBf = guidedFilter(WB, guide, mw, mh, radius, GUIDED_EPS);

  // ---- 3. フル解像度へ拡大してブレンド ----
  const Wfull = bilinearResize(Wf, mw, mh, width, height);
  const WAfull = bilinearResize(WAf, mw, mh, width, height);
  const WBfull = bilinearResize(WBf, mw, mh, width, height);

  for (let i = 0; i < pixelCount; i++) {
    const rawW = Wfull[i];
    if (rawW < MIN_EFFECTIVE_WEIGHT) continue;
    const w = Math.min(MAX_BLEND_WEIGHT, rawW);
    // premultiplied を戻す。フィルタで多少ずれるため目標色はモデル値域内へクランプ
    const aT = Math.max(-60, Math.min(60, WAfull[i] / rawW));
    const bT = Math.max(-60, Math.min(60, WBfull[i] / rawW));
    a[i] = a[i] * (1 - w) + aT * w;
    b[i] = b[i] * (1 - w) + bT * w;
  }
}
