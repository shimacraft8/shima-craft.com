# 素材・字体・コンポーネントの所在

|素材|編集元|取り扱い|
|---|---|---|
|朱/金の日輪、水平の反射、鳥、墨雲|Web `web/app.js` のillustration、Native `apps/mobile/src/ui.tsx` のWeatherArt|独自SVG実装。実景写真ではない。輪郭/波の細さ/余白を維持|
|和紙の粒子|Web `web/assets/paper.svg`、Native `apps/mobile/assets/paper.png`|独自の微細テクスチャ。本文の可読性を優先、Native opacity0.06|
|ナビ・外部リンク・保存記号|上記共通UI部品/スタイル|独自線画SVG/文字。絵文字のUIアイコンへの置換なし|
|昼夜の色|`tokens.json`|Native直接参照、Web CSSをビルド生成。二重編集しない|
|大きな英数字|OSのHelvetica Neue/HelveticaNeue-Thin等|フォントファイルの同梱/配布なし。Android実機の同じ雰囲気は未確認|
|日本語|システムゴシック、一部の明朝見出し|システム字体、無許諾Webフォントなし|
|画面比較・状態別証跡|`design/screenshots/`、`design/atmosphere.jpg`|このローカル実装のキャプチャ。デモ温度を含む|
|参照ギャラリーの画像|`research/pocket-*.jpg`|調査資料のみ。アプリへの同梱や公開素材としての転用なし|
|潮汐/予報/XML|`server/data/`、`tests/fixtures/`、`research/jma-inspection/`|公式情報を加工。URL/SHA-256/取得の証跡を保持。実況/現在状態と混同しない|

添付の参照画像そのものや、外部の景観写真・地図タイルはアプリ素材へ流用していません。実写真・地図・追加フォントを採用する場合は権利、出典、配布範囲を先に確認します。

0.3.0で専用の昼夜アイコン/スプラッシュ5素材を作成。編集元はscripts/build-brand-assets.py（再生成のみ任意のPillowが必要）、1024px PNGは同梱。iOSは不透明、Android前景とスプラッシュは透明。既存の添付画像の編集/切り抜きではなく独自コードの幾何学日輪です。未使用のExpoテンプレート画像は整理。OS上の見え方とストア最終素材は実機未確認。
