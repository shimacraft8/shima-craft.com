# Web Interface Guidelinesレビュー

最新の[公式ガイドライン](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)を取得し、新規Web UIと共通アプリをレビュー。以下はこの実行中に発見し修正した点です。

|ファイル/場所|発見|処置|
|---|---|---|
|`web/style.css:203` / wordmark|ロゴのクリック領域が小さい|48pxの高さ・80px以上の幅|
|`web/style.css` / display font|local font-faceが通常書体に固定され細字にならない|Helvetica Neue本来のウェイト選択へ修正|
|`web/app.js` / render|モバイルで見える見出し階層/テーマ色が不足|スクリーンリーダー用h1、html color-schemeとtheme-colorの同期|
|`web/app.js` / more/input|未保存メモが画面再描画で失われ得る|Webは入力時保存、再読み込み確認|
|`web/app.js` / theme/search/date|選択状態とURLのずれ|テーマ/地域/日付/状態/検索フィルタをURLへ反映|
|`web/style.css` / large text|2列/横並びが文字拡大時に窮屈|主要データと緊急連絡を縦積み、390pxで横はみ出しなし|
|`apps/mobile/src/ui.tsx` / texture|React Native Webで紙画像が180px四方だけ表示|画像コンテナを100%に。再ビルドと画面確認|
|`web/app.js` / today|方位のラベルに東西と北基準が混在|「方位x° / 真北基準」へ統一|

未解決：Aは提供済み参考UIのため旧ラベル/サイズを保持し、採用対象と同じ品質保証には含めない。iOS/AndroidのVoiceOver/TalkBack、Dynamic Type、実safe area、屋外可読性は未実機検証。Webのreduced-motion分岐はコード確認済み、OS設定を変えた実動作試験は未実施です。

## 続行分のレビュー（2026-10-14）

最新版の公式ガイドラインを再取得。地域予報は独立した小見出し/罫線の中に置き、出典・発表/取得/鮮度を共通順で表示。非同期状態はrole=status、外部サイトは通常のリンク、再取得はbutton、装飾SVGは読み上げ対象外。日付/地域が変わったときの旧予報の混入を抑止し、検索カテゴリをURLへ反映。観光の追加でも下部5タブを維持しました。

色は共通JSONから生成/参照し、昼夜を二重編集しない設計へ変更。375/390/430pxを再確認。実機のコントラスト/読み上げ/圏外は引き続き未確認です。
