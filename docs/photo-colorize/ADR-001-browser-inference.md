# ADR-001: 白黒写真カラー化をブラウザ内AI推論へ移行する

- ステータス: 採用
- 日付: 2026-07-02
- 対象: https://shima-craft.com/tools/photo-colorize

## 背景

従来の実装は Vercel API Route から Replicate API（piddnad/ddcolor）を呼び出す構成だった。
Replicate はクレジット購入が必要で、課金未設定のため `REPLICATE_BILLING_REQUIRED` が発生し
ツールが利用不能になっていた。利用者無料を維持しつつ、SHIMA CRAFT 側にも
「画像1枚ごとの外部API従量課金」が発生しない方式が必要になった。

## 決定

**ONNX Runtime Web による完全ブラウザ内推論へ移行する。**

- モデル: Zhang et al. *Real-Time User-Guided Image Colorization with Learned Deep Priors*
  (SIGGRAPH 2017)。richzhang/colorization リポジトリの `siggraph17` 事前学習済み重みを
  ONNX へ変換して使用。
- 実行系: onnxruntime-web 1.27.0
  - WebGPU が使える環境 → WebGPU EP + fp16 モデル（68.5MB）
  - それ以外 → WASM EP（SIMD, 1スレッド） + int8 動的量子化モデル（43.6MB）
  - WebGPU 初期化失敗時は自動で WASM へフォールバック
- 色処理: 元画像から Lab の L（輝度）を抽出し、モデルには 256×256 の L のみを入力。
  モデル出力は ab（色差）のみ。ab を元解像度へバイリニア拡大し、
  **元画像の L と再合成**して最終画像を得る。輝度・輪郭・構図は元画像のものが
  そのまま保持され、顔・人物・文字・建物の形状は変化しない。
- 品質ガード: chroma（√(a²+b²)）を上限 60 でクランプし過剰彩度を抑制。
  出力寸法は処理対象画像と完全一致。結果のグレースケール構造差を検証する
  ユニットテストを持つ。
- 配信: モデル・onnxruntime-web ランタイムとも `public/` から同一オリジンで配信。
  外部 CDN・外部 API への依存なし。モデルは Cache Storage API でブラウザにキャッシュ。

## 検討した代替案

| 案 | 判断 | 理由 |
|---|---|---|
| DDColor-tiny を ONNX 化してブラウザ実行 | 不採用 | fp32 270MB と大きく、int8 量子化が Spectral Norm の動的重みで失敗。品質も屋外風景で錆色の誤着色が発生（siggraph17 は彩度控えめだが誤色が少ない安全側）。Apache-2.0 で将来の再検討は可能 |
| eccv16 (Zhang, ECCV 2016) | 不採用 | siggraph17 と同等サイズで、siggraph17 の方が新しく色にじみが少ない |
| DeOldify | 不採用 | GAN ベースで重みが大きく、ONNX 変換の公式サポートなし。輝度保持の保証もない |
| OpenCV.js DNN + Caffe モデル | 不採用 | opencv.js の DNN は単スレッド WASM のみで遅く、モデルも古い eccv16 相当 |
| Transformers.js | 不採用 | カラー化タスクの実用モデルがライブラリに存在しない |
| 無料枠のある外部カラー化 API | 不採用 | 無料枠終了・規約変更・サービス停止に依存し、要件（従量課金ゼロの恒久性）を満たさない |
| 自前 GPU サーバー | 不採用 | 固定費が発生し「追加費用なし」の要件に反する |

## モデル選定の根拠

- **ライセンス**: richzhang/colorization は BSD-2-Clause（コード・配布重みとも）。商用利用可。
- **アーキテクチャが要件に一致**: このモデルは設計上「L を入力し ab のみを予測する」ため、
  画像全体を再生成する方式と違い、元画像の構造破壊が原理的に起きない。
- **サイズ**: int8 43.6MB / fp16 68.5MB。モバイル回線でも一度きりのダウンロードとして許容範囲。
- **実測品質**: 奄美の実写真3枚（空撮・テラス・寝室）で検証。
  グレースケール構造 SSIM 0.998 以上、輝度平均差 0.08（L 0-100 スケール）。
  int8 と fp32 の出力は視覚的に同等。

## 実測値（PoC, 2026-07-02, Intel Mac / Chromium）

| 項目 | WebGPU (fp16) | WASM int8 (1スレッド) |
|---|---|---|
| セッション初期化 | 3.5〜5.5s | 約1s |
| 推論（初回） | 1.4s | 3.3〜6.4s |
| 推論（2回目以降） | 0.1s | 約3.3s |
| 出力の輝度構造差 (grayMAD) | 0.07 | 0.08 |

## 影響

- Replicate・Turnstile・rate limit・API Route は不要になり削除する
  （API Route は互換のため 410 を返す形で残す）。
- `REPLICATE_API_TOKEN` / `REPLICATE_DDCOLOR_VERSION` / `TURNSTILE_SECRET_KEY` /
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` への参照をコードから除去。
- リポジトリに約 140MB（モデル2つ + ORT ランタイム）の静的ファイルが追加される。
  GitHub の1ファイル100MB制限内。Git LFS は使用しない。
- 費用構造は「画像1枚ごとの従量課金ゼロ」になる（詳細は cost-audit.md）。
