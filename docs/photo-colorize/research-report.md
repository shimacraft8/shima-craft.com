# 白黒写真カラー化 — ブラウザ内推論 技術・ライセンス調査書

調査日: 2026-07-02
調査者: Claude Code（一次資料: 各公式リポジトリ / モデルカード / onnxruntime.ai / webkit.org）

## 1. 実行環境（推論ランタイム）

### ONNX Runtime Web（採用）
- 開発元: Microsoft / 最新: 1.27.0（npm, 2026年6月時点）/ ライセンス: MIT
- 実行プロバイダ: `webgpu`（GPU）、`wasm`（CPU, SIMD, マルチスレッドは COOP/COEP 必須）
- 1.27 の `ort.min.mjs` 単一バンドルで WebGPU(JSEP)/WASM 両対応を確認（PoC 実測）
- WASM 全オペレータ対応、WebGPU はサブセット（siggraph17 の全オペが WebGPU で動作することを実測確認）

### WebGPU ブラウザ対応（webkit.org / caniuse 確認）
- Chrome/Edge 113+（2023）、Firefox 141+、**Safari 26（macOS/iOS/iPadOS, 2025年9月）**
- 2026年7月現在、全主要ブラウザの最新版で利用可能
- 非対応環境（旧 iOS 等）は WASM SIMD で全てカバー（Safari 16.4+ / Chrome / Firefox / Edge）

### その他の候補
- WebGL fallback: ORT Web の WebGL EP はレガシーでオペレータ不足 → 不採用（WASM が下位互換を担う)
- wonnx (Rust/WebGPU): メンテナンス頻度が低くオペレータ不足 → 不採用
- OpenCV.js DNN: 単スレッド WASM のみ・遅い → 不採用
- Transformers.js: カラー化タスクの実用モデルなし → 不採用

## 2. カラー化モデル比較

| 項目 | siggraph17（採用） | eccv16 | DDColor-tiny | DDColor-large | DeOldify |
|---|---|---|---|---|---|
| 開発元 | R. Zhang et al. (UC Berkeley) | 同左 | piddnad (阿里巴巴) | 同左 | jantic |
| 最終更新 | 2020-09 (PyTorch対応) | 同左 | 2024-01 | 同左 | 2021頃 |
| コードライセンス | BSD-2-Clause | BSD-2-Clause | Apache-2.0 | Apache-2.0 | MIT |
| 重みライセンス | BSD-2-Clause（リポジトリ同梱扱い） | 同左 | Apache-2.0（HFモデルカード確認） | 同左 | MIT（ただし配布経路が非公式） |
| 商用利用 | 可 | 可 | 可 | 可 | 可（重みの出所要注意） |
| ONNX化 | 可（本調査で実施・パリティ2.6e-05） | 可（実施済・7.3e-05） | 公式スクリプトあり（実施済） | 公式スクリプトあり | 非公式のみ |
| ブラウザ実行 | 可（実測） | 可（未計測） | 理論上可・未検証 | 実質不可（容量） | 未検証 |
| fp32容量 | 137MB | 129MB | 270MB(ONNX) | 900MB超 | 250MB前後 |
| 量子化後 | int8 43.6MB / fp16 68.5MB | 同程度 | int8失敗(Spectral Norm動的重み) | — | — |
| CPU(1スレッド)推論 | 2.1s(native)/3.3-6.4s(WASM実測) | 同程度 | native 0.3s(8スレッド)・WASM未計測 | — | — |
| WebGPU推論 | 1.4s初回/0.1s以降（実測） | — | — | — | — |
| Safari対応 | WASM=Safari16.4+/WebGPU=Safari26+ | 同左 | — | — | — |
| iPhone/Android | WASM可・iOS26+/Android ChromeはWebGPU可 | 同左 | — | — | — |
| 色の自然さ | 彩度控えめ・誤色少（安全側） | siggraph17より色にじみ多 | 鮮やか・ただし風景で錆色誤着色を実測 | 最高品質 | 良（セピア寄り） |
| 構造保持 | L入力/ab出力のため原理的に完全 | 同左 | ab出力のため同等 | 同等 | GAN由来のにじみリスク |
| 必要メモリ | 実測でタブ内〜500MB程度 | 同等 | より大 | 不可 | 大 |
| 保守性 | 枯れて安定・依存なし | 同左 | timm等要 | 同左 | fastai依存・重い |
| 採用 | **採用** | 不採用 | 不採用 | 不採用 | 不採用 |
| 不採用理由 | — | 旧世代・品質劣位 | 容量2倍・int8量子化不可・誤着色の失敗モード | 容量が非現実的 | 変換経路とサイズ、重み配布が非公式 |

※「—」は当該候補を先行評価で除外したため未計測。

## 3. モデル・ランタイムの配信方式比較

| 方式 | 判断 | 理由 |
|---|---|---|
| リポジトリ内 public/ 配信（採用） | 採用 | 同一オリジンで CORS 不要・外部依存なし・Vercel CDN で配信。1ファイル100MB未満で GitHub 制限内 |
| Hugging Face hosting | 不採用 | 商用サイトからのホットリンクはレート制限リスク・外部依存が増える |
| jsDelivr 等 | 不採用 | npm/GitHub 配布物以外のモデル配信は用途外 |
| Vercel Blob | 不採用 | 転送量課金が発生しうる・構成が増える |
| GitHub Releases | 不採用 | CORS・リダイレクトの取り回しが煩雑 |

ブラウザ側は Cache Storage API により2回目以降のダウンロードを回避する。

## 4. 検証に使った一次資料

- https://github.com/richzhang/colorization （ライセンス・モデル定義・正規化定数）
- https://colorizers.s3.us-east-2.amazonaws.com/siggraph17-df00044c.pth （公式重み）
- https://github.com/piddnad/DDColor / MODEL_ZOO.md / scripts/export_onnx.py
- https://huggingface.co/piddnad/ddcolor_paper_tiny （重み220MB・apache-2.0表記）
- https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- https://webkit.org/blog/16993/ （Safari 26 の WebGPU 対応）
- https://caniuse.com/webgpu
