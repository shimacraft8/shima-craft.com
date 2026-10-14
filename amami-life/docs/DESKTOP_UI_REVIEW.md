# PC・ロゴ改修 0.3.3

2026-10-14 JST。ユーザーの「既存ロゴを使う」「スマホ寄りを改善する」という指示を反映。公開先は引き続き https://shima-craft.com/。ネイティブ版は変更していません。

## 変更

- 既存SHIMA CRAFTのlogo.png / logo-white.pngを原寸比で再利用。昼はカラー、夜は白。新しい描き直しや色変更はなし。
- PCの430pxスマホ枠と左の大きな紹介エリアを廃止。最大1440pxの横幅を使い、観測気温/予報/日輪と潮汐/太陽の時間を並列にする。
- PCは上部5ナビと地域変更。交通・観光・防災の一覧は2列。クリック後はページ先頭へ戻り、前画面のスクロール位置に取り残されない。
- スマホは縦の構図と下部5タブ。狭い画面では図柄の高さだけを調整し、本文の読みやすさを保つ。
- 制作サービス/相談メニューとページ末尾の案内、/studio、既存各ページへの接続は維持。新APIや事業者データは追加していない。

## 検証

ブラウザ通常文字: 320×667、375×667、390×844、430×932、768×1024、1024×768、1280×720、1440×900、1920×1080。全9サイズで横はみ出しなし。スマホ4サイズで次の潮/日の入りが下部タブより上。PC1024×768、1280×720、1440×900、1920×1080では主要要約が初期の表示範囲内。詳細や出典、追加一覧はページスクロールで読む。

朱と和紙/墨と金・両ロゴ、PC検索（飛行機→空港）、検索結果2列、交通クイックリンク→移動タブとscrollY=0、メニューのEscapeとfocus復帰を実操作。サイト内「文字を大きく」でも1440pxで横はみ出しなし、画像を保存。OS文字拡大とは別。ブラウザconsole errorはなし。

全78件の単体/HTTP試験、Lint、strict型検査、公開ビルドを確認。公式Web Interface Guidelinesを更新取得して、画像のalt/サイズ、意味を持つ操作要素、フォーカス、テーマ状態、レスポンシブと動き抑制をレビュー。証跡はresearch/desktop-v033。

iPhone/Android実機、Safari/Chrome実機差、VoiceOver/TalkBack、OSの200%文字、会員ログイン・フォーム送信は未確認。警報/台風の自動統合や事業者電話帳など、以前からの未完成事項は解消していない。

## 公開・ソース・復旧

Cloudflare shimacraft8@gmail.com / account 42f69e35f08bb21dca5194467e2f59de、Worker shima-craft-amami-life。既存のshima-craft-com-productionは再デプロイしない。専用認証、固定zone/routes、元WorkerのService Bindingを維持する。本人と対象の再確認後に同Workerを更新。

GitHub shimacraft8/shima-craft.com、codex/amami-life-home-20261014 のamami-life/を更新。mainや別プロジェクトの変更はしない。ZIPはnpm run packageで再生成。復旧はSHIMACRAFT_WEB_RELEASE.mdの対象2route限定手順。公開後のHTTP結果とWorker versionはrelease.jsonを参照。
