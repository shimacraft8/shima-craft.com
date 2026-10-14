# Web UI確認 2026-10-14

ui-ux-pro-maxとweb-design-guidelinesを適用。公式Web Interface Guidelinesの最新版 command.md を取得して実装後レビュー。出典: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

既存の朱/和紙・墨/金、Helvetica Neueの薄い数値、明朝本文、独自SVGと紙を維持。PCは制作案内と日常の道具を2列、狭い画面はアプリ中心にする。8サイズの通常文字で横はみ出しなし、主要要約は下部タブより上。メニューはdialog、閉じた後のfocus復帰、label/見出し、URLにテーマ/地域/日付/タブを反映。観測と地域予報と装飾図を区別。常時動く装飾を追加していない。

本番で5タブと気温/予報/潮取得、制作メニューリンク先、/studioのFAQ開閉（aria-expanded=true）、旧 /#contact の移設先を確認。ブラウザでは target=_blank の新規タブがツール一覧に現れなかったため、新規タブ生成そのものは未確定。href確認に加えて同じ遷移先へ直接移動し本文/操作を検証した。問い合わせ送信・実発信・会員機能は検証していない。

実iPhone/Android、OS文字倍率200%、VoiceOver/TalkBackは未確認。今回の通常文字・内蔵ブラウザ測定をそれらの合格と扱わない。
