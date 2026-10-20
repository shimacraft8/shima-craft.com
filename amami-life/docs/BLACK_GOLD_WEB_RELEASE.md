# AMAMI LIFE Web 0.3.5 — 黒金への統一

2026-10-20。ユーザーが今回の修正後のGitHub保存とCloudflare公開を明示承認。

- HPを墨と金に固定。URLや過去の保存設定にpaperがあってもinkへ正規化。テーマ選択をHP・制作メニュー・設定から除去。比較プロトタイプとNativeは対象外。
- 背景の基準色 #222522 と、同じ微細な質感をページ全体へ。本文だけのテクスチャを廃止し、外側/内側の段差を解消。操作部の背景差は区別のため保持。
- 既存白ロゴと既存カラー版の赤い波をSVGで合成。元PNGは変更せず、赤い領域をクリップして使用。ロゴの輪郭や文言を生成し直していません。
- 前段の文字・導線・短い動きの改善を含むHPのみを公開。解析画面、Google連携、GA4タグ追加は未公開。公開用Workerは0.3.4の処理を保持し、管理UI/トラッカー資産も含めません。

## 対象照合

GitHub本人 shimacraft8 / repo shimacraft8/shima-craft.com / 保存先 codex/amami-life-home-20261014。mainや既存Nextページを更新しません。

Cloudflare本人 shimacraft8@gmail.com / account 42f69e35f08bb21dca5194467e2f59de / zone cdfc2875eb9e0bf217159ec8be376373 / domain shima-craft.com / Worker shima-craft-amami-life。

元Worker shima-craft-com-production とそのデプロイは維持。変更前versionは041f929c-6251-4d53-9323-6e094fe5e014。専用認証を利用し、別プロジェクトのグローバル認証には触れません。

## 検証

開発全体は118試験、HP専用の公開ソースは87試験（従来82＋画面遷移5）。Lint/strict型検査/公開ビルド/Worker dry-run成功。公開ビルドのHP資産をローカル検証版と照合。core.js/usage.jsは共用依存のシンボリックリンクによるモジュール名の差だけを正規化して比較しています。

ブラウザ10画面サイズで横はみ出しなし、黒金固定、テーマ操作なし、全ページ背景への質感適用を確認。既存白赤の意匠がブラウザで見えることも確認。公式Web Interface Guidelinesを取得し、ラベル・コントラスト・フォーカス・固定ナビ・reduced motionを変更部分で再確認しました。

iOS/Android実機、OS文字拡大/Reduce Motion、VoiceOver/TalkBackは未確認。防災の自動取得など以前の未完成機能を完成扱いにしません。

公開結果・デプロイID・HTTP/実データ/既存ページ検証は research/black-gold-release/ に保存します。本書記載の事前検証だけで公開完了とは扱いません。
