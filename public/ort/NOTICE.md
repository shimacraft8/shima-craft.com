# onnxruntime-web ランタイム（vendored）

- 出典: npm パッケージ `onnxruntime-web` **1.27.0**（Microsoft, MIT License — 同梱の LICENSE 参照）
- 同梱ファイル: `ort.min.mjs` / `ort-wasm-simd-threaded.jsep.mjs` / `ort-wasm-simd-threaded.jsep.wasm`
- 用途: /tools/photo-colorize のブラウザ内カラー化推論
- 更新手順: `npm pack onnxruntime-web@<version>` で取得した dist/ から上記3ファイルを差し替え、
  `lib/colorization/browser/ortRuntime.ts` のコメントのバージョン表記を更新する
