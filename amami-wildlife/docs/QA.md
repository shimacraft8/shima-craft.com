# 検証記録 0.2.0 / 2026-11-02

## 自動検証

Node標準テスト15項目成功（test-results.tap）。全39詳細ページ、内部リンク/画像、出典、透過素材選択、写真39件のライセンス/クレジット、ユーザー指定名称台帳、白背景/ロゴなし/タイトル、修正済みの爬虫類・アリ・ルリカケス、横展示の操作/静的フォールバック、資産URLの内容ハッシュを検査。画像の形態を自動的に証明するテストではない。

WorkerのGET/HEAD、範囲外404、未知URL404＋noindex、308、CSP/フレーム禁止/Content-Type保護を検査。公開HTTPと既存サイトの不変確認はproduction-http.json / cloudflare-verification.jsonに実結果を記録。

## ブラウザでの確認

- IAB、PC1440×1000。森→川→海、ボタンとキーボード矢印、aria-current/フォーカスを確認。スクロール中に横移動し各すみかのリンクが利用できる。自動送りやホイール横取りなし。
- 小画面390×844、320×740。横はみ出しなし。横移動を解除し3すみかを縦に表示。最初の画面でイラストが見えるよう導入部を短縮。
- 動きを止める操作で浮遊とポインター奥行きを停止。ルートにも停止クラスを反映しsmooth scrollも止める。
- 図鑑の一覧へ飛ぶ深いアンカーを確認。chapterが残っていても#catalogを優先。レイアウト強化後に一覧位置を復元。
- 昆虫フィルター12結果、写真タブ、政府掲載写真の出典表記と小さい画像の表示制限を確認。写真は計39件。標本/飼育/亜種未確認はラベル表示。
- 本番相当のWorkerローカル配信（Wrangler4.156.0）でCSP、画像表示、操作を確認。確認範囲のconsole error/warnは0件。
- ブラウザに旧スクリプト等が残る問題を発見し、CSS/JS/写真/イラストURLへ内容ハッシュを追加して再確認。
- 39点の採用画像を分類群別一覧で目視。昆虫12点は左右3本ずつの脚と触角を区別して再生成・確認。蝶の前脚の縮小は資料に照合。

## デザイン・アクセシビリティレビュー

ui-ux-pro-maxを適用。最新Web Interface Guidelinesを取得してコードレビュー（https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md 、2026-11-02）。

修正記録（ファイルと該当実装）:

- public/wildlife/assets/journey.js: 非表示のPC章はinert/aria-hidden。小画面では全章を読める通常文書へ戻す。
- public/wildlife/assets/journey.css: PC横演出は高さ650px以上のみ。小画面/低い画面/prefers-reduced-motionは縦表示。transform/opacity主体。画面外で連続浮遊を止める。
- scripts/journey.py: すみか操作に名前、順序、aria-controls、状態通知、一覧へのスキップ、通常リンク。
- public/wildlife/assets/app.js: 停止状態をhtmlとbodyで統一。
- scripts/build.py: 画像の実寸比/alt/遅延読込、写真の撮影者と掲載元を区別。

## 未確認・限界

iPhone Safari / Android Chrome実機、VoiceOver/TalkBack、実端末の最大文字拡大とOSの動きを減らす設定は未確認。reduced-motionは分岐のコード確認に留まる。全種の同定・形態の専門監修、全群島の全種網羅は未達成。参考動画の賞級品質やWebGL/3Dモデルを実現したという主張はしない。

## 実機確認手順

1. 公開URLをSafari/Chromeで開き、縦横向きと文字拡大で表示を確認。
2. 森/川/海を閲覧し、生き物をタップ、2枚目の実写・クレジットを確認。
3. 検索/島/すみか/渡りで絞り込み、空結果から復帰、URL共有とブラウザバックを確認。
4. OSの動きを減らす設定で再読込し、縦表示と静止を確認。
5. VoiceOver/TalkBackで見出し/検索/結果件数/タブ/詳細リンクを確認。
