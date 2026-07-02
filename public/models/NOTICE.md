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
