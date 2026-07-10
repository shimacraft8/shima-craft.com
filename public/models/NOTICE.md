# カラー化モデル（siggraph17 ONNX 変換版）

- 元モデル: Real-Time User-Guided Image Colorization with Learned Deep Priors
  (Zhang, Zhu, Isola, Geng, Lin, Yu, Efros — SIGGRAPH 2017)
- 出典リポジトリ: https://github.com/richzhang/colorization （BSD-2-Clause — 同梱の LICENSE 参照）
- 元重み: https://colorizers.s3.us-east-2.amazonaws.com/siggraph17-df00044c.pth
- 変換: PyTorch 2.2.2 → ONNX opset 17（2026-07-02）。
  - `siggraph17_fp16.onnx`: float16 変換（WebGPU 用, 68.5MB）
  - `siggraph17_int8.onnx`: 動的 int8 量子化（WASM 用, 43.6MB）
- グラフ入出力: 入力 `input_l` = Lab の L (0..100) [1,1,256,256] / 出力 `output_ab` = ab [1,2,256,256]
  （正規化・非正規化はグラフ内に含む）

---

# カラー化モデル（DDColor ONNX 変換版・高品質モード）

- 元モデル: DDColor: Towards Photo-Realistic Image Colorization via Dual Decoders
  (Kang, Yang, Yin, Chai, Wang, Chen, Hu — ICCV 2023)
- 出典リポジトリ: https://github.com/piddnad/DDColor （Apache-2.0 — 同梱の LICENSE-DDColor 参照）
- 元重み: https://huggingface.co/piddnad/ddcolor_paper_tiny （DDColor-T / ConvNeXt-T, Apache-2.0）
- 変換: PyTorch 2.2.2 → ONNX opset 17 → onnxslim 簡約（2026-07-07）。
  - `ddcolor_webgpu.onnx.part0..2`: fp32（WebGPU 用, 計 242MB, 3分割）
    ※ onnxruntime-web の WebGPU は本モデルの fp16 で数値が不正になるため fp32 を採用
  - `ddcolor_wasm.onnx.part0..1`: fp16（WASM 用, 計 121MB, 2分割）
  - 100MB超のためGitHub制限回避に分割配信し、取得後にブラウザで結合して初期化する
- グラフ入出力: 入力 `input` = グレーRGB (0..1) [1,3,512,512] / 出力 `output` = ab [1,2,512,512]
- 更新手順: DDColor/scripts の要領で .pth → ONNX 化 → `onnxslim` → fp16/fp32 →
  90MB以下に分割し、`ddcolor.manifest.json` と本NOTICEを更新する
- 2026-07-10: `ml/ddcolor-finetune/` のノートブックで古写真向けファインチューニング済み
  （COCO val2017 約5,000枚＋古写真劣化合成、6,000 steps、Colab T4）。
  Colab の新exporterが外部データ分離形式で出力したため、ローカルで内部化→
  onnxslim 簡約→fp16 再生成して配置（fp32/fp16 平均差 0.0078）

---

# 人物パーツ分割モデル（MediaPipe Selfie Multiclass）

- モデル: `selfie_multiclass_256x256.tflite`（Google MediaPipe Image Segmenter）
- ライセンス: Apache-2.0（商用利用可）
- 出典: https://developers.google.com/mediapipe/solutions/vision/image_segmenter
- 取得元: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
- クラス: 0=背景, 1=髪, 2=体の肌, 3=顔の肌, 4=服, 5=その他（装身具等）
- ランタイム: @mediapipe/tasks-vision（Apache-2.0）。WASM は /public/mediapipe/ に同梱
- 用途: 会員向け色ヒントの適用範囲を人物パーツ単位で画素精度に限定する
  （推論は端末内で完結し、画像は外部へ送信されない）
