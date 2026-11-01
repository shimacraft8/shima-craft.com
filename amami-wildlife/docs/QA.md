# 検証記録 2026-11-01

## 自動検証

Node標準テスト10項目成功（`test-results.tap`）。39詳細ページの配信、全HTML内の内部リンク/画像の存在、出典、画像寸法とalt、未照合文献の分離、全56トンボ項目、写真30点のライセンス/撮影者/配信ファイル、白背景/マークなし/新タイトル/アリv2を確認。

WorkerはGET/HEADのみ。範囲外404、未知の図鑑URL404＋noindex、末尾スラッシュ308、CSP/フレーム禁止/Content-Type保護をモックで確認。JSとWorkerの構文チェック成功。Wrangler dry-run成功。実際のCloudflare配信確認は公開結果ファイルに分けて記録。

## 実ブラウザー（デスクトップ内のIAB）

- PC1280/1440px、スマートフォン相当390px、320pxで確認。
- 320pxで太陽の装飾が横にはみ出す問題を発見し、装飾自体を削除。修正後scrollWidth＝320px。
- 風景の5動物に名前とリンク。ルリカケスをクリックして詳細へ遷移。
- ひらがな「るりかけす」検索で1項目。冬鳥でサシバ・シロハラの2項目。
- 空の検索結果とリセット、39項目までの追加表示を確認。未実行の入力タイマーが残らないよう操作時に解除。
- 文献検索「Anguilla」で3記録。出典とPDFページ番号を表示。
- 動き停止でanimation-play-state: paused。夜の色切り替えでaria-pressedとクラス更新。
- ルリカケス詳細の2枚目で実写・撮影者・ライセンスが表示。URLはview=photo。左矢印キーで1枚目に戻り、タブのaria-selectedとフォーカスが連動。
- 生成素材5点と背景、写真30点を目視。アリの人工的な笑顔マーク削除済み。
- 紙テクスチャ/左上の葉マークを削除し、白背景・新タイトルを確認。

## Web Interface Guidelinesレビュー

参照: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md （2026-11-01取得）。ui-ux-pro-maxを設計時に使用。

修正した指摘:

- `public/wildlife/assets/style.css` - 320pxで装飾が横にはみ出し → 削除。
- `scripts/build.py` - 生成画像のwidth/heightを正方形で固定していた → 素材台帳の実寸比へ変更。
- `public/wildlife/assets/app.js` - 文献検索のURL状態がなかった → record-qを反映。
- `public/wildlife/assets/app.js` - 非同期読込エラーに読み上げ通知がなかった → role=alert。

見出し階層、ラベル、スキップリンク、フォーカス、結果通知、空状態、透過画像、検索のURL状態、タブのキーボード操作、動きの停止とprefers-reduced-motionを実装。長い文献一覧は50件ずつ表示し、図鑑は18件ずつ表示。

## 検証していないもの

iPhone Safari/Android Chrome実機、VoiceOver/TalkBack、端末での文字最大拡大、OSの動きを減らす設定での実機動作、全図鑑項目の専門家による同定・形態監修、全群島の全種網羅。CSSのreduced-motion分岐はコード確認であり、OS設定を切り替えた実機試験ではない。

## 実機確認手順

1. 公開URLをSafari/Chromeで開き、横向き・縦向き・文字拡大で横スクロールが生じないか確認。
2. 各動物をタップ。1/2枚目の切り替え、写真のクレジット、出典、戻る動作を確認。
3. 名前・島・すみか・渡り鳥で絞り込み、空の結果から戻る。URLを共有して同じ条件が開くか確認。
4. OSの動きを減らすを有効にして再読込。停止状態で風景が動かないことを確認。
5. VoiceOver/TalkBackでタブ、検索、結果件数、詳細へのリンクを順に確認。
