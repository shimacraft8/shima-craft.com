/**
 * Claude Vision API から取得した色ヒントの型定義とブラウザ内適用ロジック。
 *
 * ヒントは ONNX モデルの推定結果（ab チャンネル）を「既知の歴史的・文脈的な正しい色」へ
 * 部分的にブレンドする形で適用する。weight が 0 に近いほど ONNX の結果を尊重し、
 * 0.5 に近いほどヒントを強く反映する（0.5 超は不自然さのリスクがあるため上限とする）。
 *
 * L（輝度）は一切変更しない。ab チャンネルのみを操作する。
 */

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
};

/** Claude Vision API が返す色ヒント全体 */
export type ColorHintPayload = {
  /** シーンの説明（ログ・デバッグ用） */
  scene: string;
  /** 各セマンティック領域のヒント配列 */
  regions: ColorRegionHint[];
};

/**
 * ONNX モデルが推定した ab チャンネルへ色ヒントを部分適用する。
 *
 * 各画素について輝度 L* に基づいて最も適合する領域を選択し、
 * ONNX 出力と目標色の間を weight の割合でブレンドする。
 * 輝度が複数の領域に重なる場合は、L* が最も領域の中央に近いものを選ぶ。
 * どの領域にも属さない画素は変更しない。
 *
 * @param a         モデル推定後の a チャンネル（in-place 変更）
 * @param b         モデル推定後の b チャンネル（in-place 変更）
 * @param L         元画像の輝度チャンネル（変更しない）
 * @param pixelCount 画素数（a・b・L の有効要素数）
 * @param hints     Claude Vision が返したヒント
 */
export function applyColorHints(
  a: Float32Array,
  b: Float32Array,
  L: Float32Array,
  pixelCount: number,
  hints: ColorHintPayload
): void {
  const regions = hints.regions.filter((r) => r.weight > 0 && r.luminanceMax > r.luminanceMin);
  if (regions.length === 0) return;

  for (let i = 0; i < pixelCount; i++) {
    const lv = L[i];
    let bestRegion: ColorRegionHint | null = null;
    let bestScore = Infinity;

    for (const region of regions) {
      if (lv >= region.luminanceMin && lv <= region.luminanceMax) {
        // 領域の中心からの距離でスコアリング（最も中央に近い領域を採用）
        const mid = (region.luminanceMin + region.luminanceMax) / 2;
        const score = Math.abs(lv - mid);
        if (score < bestScore) {
          bestScore = score;
          bestRegion = region;
        }
      }
    }

    if (bestRegion) {
      const w = Math.min(0.5, Math.max(0, bestRegion.weight));
      a[i] = a[i] * (1 - w) + bestRegion.aTarget * w;
      b[i] = b[i] * (1 - w) + bestRegion.bTarget * w;
    }
  }
}
