/**
 * Vision AI（Groq / Llama 4）から取得した色ヒントの型定義とブラウザ内適用ロジック。
 *
 * ヒントは ONNX モデルの推定結果（ab チャンネル）を「既知の歴史的・文脈的な正しい色」へ
 * 部分的にブレンドする形で適用する。weight が 0 に近いほど ONNX の結果を尊重し、
 * 0.5 に近いほどヒントを強く反映する（0.5 超は不自然さのリスクがあるため上限とする）。
 *
 * 各領域はバウンディングボックス（正規化座標 0〜1）と輝度帯の両方で限定される。
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
   * 0.5 超は不自然な色になりやすいため使用しない。
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

/** 0..1 へのクランプ */
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * ONNX モデルが推定した ab チャンネルへ色ヒントを部分適用する。
 *
 * 各画素について「輝度帯 × バウンディングボックス」の両方に適合する領域のうち
 * 実効 weight（feather 減衰込み）が最大のものを選び、ONNX 出力と目標色の間を
 * その weight の割合でブレンドする。どの領域にも属さない画素は変更しない。
 *
 * @param a          モデル推定後の a チャンネル（in-place 変更）
 * @param b          モデル推定後の b チャンネル（in-place 変更）
 * @param L          元画像の輝度チャンネル（変更しない）
 * @param pixelCount 画素数（a・b・L の有効要素数）
 * @param width      画像の幅（px）。bbox の画素座標変換に使用
 * @param height     画像の高さ（px）
 * @param hints      Vision AI が返したヒント
 */
export function applyColorHints(
  a: Float32Array,
  b: Float32Array,
  L: Float32Array,
  pixelCount: number,
  width: number,
  height: number,
  hints: ColorHintPayload
): void {
  const regions = hints.regions.filter((r) => r.weight > 0 && r.luminanceMax > r.luminanceMin);
  if (regions.length === 0 || width <= 0 || height <= 0) return;

  // 事前計算: box を画素座標へ変換し、boxless の weight を制限する
  const prepared = regions.map((r) => {
    const cap = r.box ? 0.5 : BOXLESS_WEIGHT_CAP;
    const weight = Math.min(cap, Math.max(0, r.weight));
    const featherX = BOX_FEATHER * width;
    const featherY = BOX_FEATHER * height;
    return {
      lumMin: r.luminanceMin,
      lumMax: r.luminanceMax,
      aTarget: r.aTarget,
      bTarget: r.bTarget,
      weight,
      px0: r.box ? r.box.x0 * width : 0,
      px1: r.box ? r.box.x1 * width : width,
      py0: r.box ? r.box.y0 * height : 0,
      py1: r.box ? r.box.y1 * height : height,
      featherX,
      featherY,
    };
  });

  for (let i = 0; i < pixelCount; i++) {
    const lv = L[i];
    const x = i % width;
    const y = (i - x) / width;

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

    if (bestW > 0) {
      const w = Math.min(0.5, bestW);
      a[i] = a[i] * (1 - w) + bestA * w;
      b[i] = b[i] * (1 - w) + bestB * w;
    }
  }
}
