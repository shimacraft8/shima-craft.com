/**
 * Contrast Limited Adaptive Histogram Equalization (CLAHE) — ブラウザ内純 JS 実装。
 *
 * 古い退色写真はコントラストが低く、カラー化モデルが色の境界を認識しにくい。
 * モデルへの入力画像にCLAHEを適用することで局所コントラストを高め、
 * 色推定の精度（特に衣服・肌・空のエッジ付近）を改善する。
 *
 * 適用対象: モデル入力用の小サイズ RGBA（smallRgba / largeRgba）のみ。
 * 結果の合成に使う lFull（元解像度 L チャンネル）は変更しない。
 */

/** この粒状度スコアを超えたらデノイズを適用する（クリーンな写真は 2-4、粗い印刷スキャンは 6+） */
export const GRAIN_SCORE_THRESHOLD = 6;
/** このスコアを超える強粒状はブラーを2回適用する */
export const GRAIN_SCORE_HEAVY = 12;

/**
 * 粒状度の推定: 各画素の輝度と上下左右4近傍平均との絶対差の平均。
 * 古い印刷物のハーフトーン・銀塩粒子はダウンサンプル後も高周波ノイズとして残り、
 * カラー化モデルの領域認識を妨げる（まだらな色ムラの原因）。
 */
export function estimateGrain(rgba: Uint8ClampedArray, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let n = 0;
  // 3px おきにサンプリング（十分な精度で高速）
  for (let y = 1; y < height - 1; y += 3) {
    for (let x = 1; x < width - 1; x += 3) {
      const i = (y * width + x) * 4;
      const c = rgba[i];
      const up = rgba[i - width * 4];
      const down = rgba[i + width * 4];
      const left = rgba[i - 4];
      const right = rgba[i + 4];
      sum += Math.abs(c - (up + down + left + right) / 4);
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/**
 * 粒状ノイズが検出された場合のみ、モデル入力へ二項ブラー [1,2,1]/4（分離適用）をかける。
 * クリーンな画像には触れない（同一バッファを返す）。強粒状は2回適用。
 * 適用対象はモデル入力用 RGBA のみ。結果合成に使う元解像度 L は変更しない。
 *
 * @returns デノイズ後のバッファ（no-op 時は入力そのもの）
 */
export function denoiseIfGrainy(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const score = estimateGrain(rgba, width, height);
  if (score < GRAIN_SCORE_THRESHOLD) return rgba;
  const passes = score >= GRAIN_SCORE_HEAVY ? 2 : 1;

  const n = width * height;
  // 輝度平面で処理し R=G=B へ書き戻す（入力は近似グレースケール前提）
  const luma = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    luma[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  const tmp = new Float32Array(n);
  for (let pass = 0; pass < passes; pass++) {
    // 水平 [1,2,1]/4
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const l = luma[row + Math.max(0, x - 1)];
        const r = luma[row + Math.min(width - 1, x + 1)];
        tmp[row + x] = (l + 2 * luma[row + x] + r) / 4;
      }
    }
    // 垂直 [1,2,1]/4
    for (let y = 0; y < height; y++) {
      const up = Math.max(0, y - 1) * width;
      const down = Math.min(height - 1, y + 1) * width;
      const row = y * width;
      for (let x = 0; x < width; x++) {
        luma[row + x] = (tmp[up + x] + 2 * tmp[row + x] + tmp[down + x]) / 4;
      }
    }
  }

  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const v = Math.round(luma[i]);
    out[p] = v;
    out[p + 1] = v;
    out[p + 2] = v;
    out[p + 3] = rgba[p + 3];
  }
  return out;
}

/**
 * レベル補正: 輝度ヒストグラムの 1%/99% パーセンタイルを [0, 255] へ線形伸長する。
 *
 * 退色した古い写真は輝度レンジが圧縮されている（例: [40, 200]）ため、
 * モデルが「白い布」「深い影」を認識しづらく色推定が濁る。
 * CLAHE の前にグローバルなレンジ回復を行うことで局所均一化の効果も高まる。
 *
 * 既にフルレンジに近い画像（p99-p1 >= 235）はコピーせず元バッファをそのまま返す（no-op）。
 * レンジが極端に狭い画像（p99-p1 < 24）はほぼ均一とみなし増幅しない（ノイズ爆発防止）。
 *
 * 適用対象はモデル入力用 RGBA のみ。結果合成に使う元解像度 L は変更しない。
 */
export function stretchLevels(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const n = width * height;
  if (n === 0) return rgba;
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    hist[Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2])]++;
  }
  const lowCount = n * 0.01;
  const highCount = n * 0.99;
  let cum = 0;
  let p1 = 0;
  let p99 = 255;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    if (cum <= lowCount) p1 = i;
    if (cum < highCount) p99 = Math.min(255, i + 1);
  }
  const range = p99 - p1;
  if (range >= 235 || range < 24) return rgba;

  const scale = 255 / range;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.max(0, Math.min(255, Math.round((i - p1) * scale)));
  }
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    // 入力は近似グレースケール前提のため輝度 LUT を各チャンネルへ適用
    out[p] = lut[rgba[p]];
    out[p + 1] = lut[rgba[p + 1]];
    out[p + 2] = lut[rgba[p + 2]];
    out[p + 3] = rgba[p + 3];
  }
  return out;
}

/**
 * CLAHE を RGBA バッファの輝度チャンネルに適用して新しい RGBA を返す。
 * 入力が近似グレースケール（古い B&W 写真スキャン）を前提とし、
 * 輝度を均一化してから R=G=B に書き戻す（色相情報は破棄・モデルが推定するため問題なし）。
 *
 * @param rgba     元の RGBA バッファ（Uint8ClampedArray、各 CH 0-255）
 * @param width    画像幅（ピクセル）
 * @param height   画像高さ（ピクセル）
 * @param tileSize タイル 1 辺のピクセル数。width/tileSize が 8 前後になるよう設定する
 * @param clipLimit ヒストグラムクリップ係数（タイル平均カウントに対する倍率）。2.0 推奨
 * @returns        コントラスト均一化後の新しい RGBA バッファ
 */
export function claheRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  tileSize: number = 32,
  clipLimit: number = 2.0
): Uint8ClampedArray {
  const BINS = 256;
  const tilesX = Math.max(1, Math.ceil(width / tileSize));
  const tilesY = Math.max(1, Math.ceil(height / tileSize));
  const n = width * height;

  // 各画素の輝度 [0,255] を事前計算（BT.601 luma）
  const luma = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    luma[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
  }

  // タイルごとに均一化 LUT を構築
  const luts = new Array<Uint8Array>(tilesX * tilesY);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const x1 = Math.min(x0 + tileSize, width);
      const y0 = ty * tileSize;
      const y1 = Math.min(y0 + tileSize, height);
      const tileN = (x1 - x0) * (y1 - y0);

      // ヒストグラム構築
      const hist = new Uint32Array(BINS);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[luma[y * width + x]]++;
        }
      }

      // ヒストグラムクリップ＆超過分を均等再配布
      const clip = Math.max(1, Math.round((clipLimit * tileN) / BINS));
      let excess = 0;
      for (let i = 0; i < BINS; i++) {
        if (hist[i] > clip) {
          excess += hist[i] - clip;
          hist[i] = clip;
        }
      }
      const add = Math.floor(excess / BINS);
      let rem = excess % BINS;
      for (let i = 0; i < BINS; i++) {
        hist[i] += add;
        if (rem-- > 0) hist[i]++;
      }

      // CDF から均一化 LUT [0,255] → [0,255] を生成
      const lut = new Uint8Array(BINS);
      let cdf = 0;
      for (let i = 0; i < BINS; i++) {
        cdf += hist[i];
        lut[i] = Math.min(255, Math.round((cdf / tileN) * 255));
      }
      luts[ty * tilesX + tx] = lut;
    }
  }

  // タイルの LUT をバイリニア補間して各画素へ適用
  const out = new Uint8ClampedArray(rgba.length);

  for (let y = 0; y < height; y++) {
    // タイル中心基準の小数タイル座標
    const tyF = (y + 0.5) / tileSize - 0.5;
    const ty0 = Math.max(0, Math.min(tilesY - 1, Math.floor(tyF)));
    const ty1 = Math.min(tilesY - 1, ty0 + 1);
    const wy = Math.max(0, Math.min(1, tyF - Math.floor(tyF)));

    for (let x = 0; x < width; x++) {
      const txF = (x + 0.5) / tileSize - 0.5;
      const tx0 = Math.max(0, Math.min(tilesX - 1, Math.floor(txF)));
      const tx1 = Math.min(tilesX - 1, tx0 + 1);
      const wx = Math.max(0, Math.min(1, txF - Math.floor(txF)));

      const v = luma[y * width + x];
      const v00 = luts[ty0 * tilesX + tx0][v];
      const v01 = luts[ty0 * tilesX + tx1][v];
      const v10 = luts[ty1 * tilesX + tx0][v];
      const v11 = luts[ty1 * tilesX + tx1][v];

      const mapped = Math.round(
        v00 * (1 - wy) * (1 - wx) +
        v01 * (1 - wy) * wx +
        v10 * wy * (1 - wx) +
        v11 * wy * wx
      );

      const p = (y * width + x) * 4;
      out[p] = mapped;
      out[p + 1] = mapped;
      out[p + 2] = mapped;
      out[p + 3] = rgba[p + 3];
    }
  }

  return out;
}
