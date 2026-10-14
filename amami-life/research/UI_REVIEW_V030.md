# 0.3.0のUI確認

参照：UI/UX Pro MaxのFeedback/Loading Indicatorsと、2026-10-14に取得したVercel Web Interface Guidelines。
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

既存のMASTERを優先し、色/細字/紙/日輪/反射/5タブは維持しました。

- apps/mobile/src/observations.tsx：実観測と装飾の区別、観測所名/観測/取得、欠測/古さ/通信失敗、過去未来非表示、再取得、文字拡大時の縦積みを確認。
- apps/mobile/src/ui.tsx：装飾SVGを読み上げ対象外へ。観光ドメイン漏れを修正し、公式台帳に許可先を統一。
- apps/mobile/src/app/more.tsx：リリース相当のExpo Webで開発状態切替が非表示。プライバシー/利用案内を同じ本文/罫線で表示。
- web/app.js：320/390pxで小数気温の横はみ出しなし。再取得と経過時間による古さ表示。非同期ラベルはrole=status。
- 5タブと地域/テーマ/日付をブラウザ操作で確認。Native/通常Webのブラウザwarn/errorなし。

画像はExpo Web/通常Webの確認で、実機審査用ではありません。VoiceOver/TalkBack、OSの文字拡大、Android字幅、実機safe area、屋外の視認性、OSアイコン/起動画面は未確認。Webの既存200%検証は前段の記録であり、今回の新気温部品の全OS文字拡大を検証済みとはしません。

公開プライバシー/サポート先と公開主体が未確定なので、ストア提出可とは判定していません。
