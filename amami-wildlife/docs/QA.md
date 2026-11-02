# 0.4.0 ローカル候補の検証（2026-11-02）

本番未公開。トップを目線高の連続した3D森林へ再改修。最終の森はforest-desktop.png / forest-mobile.pngで確認でき、途中の島模型案は不採用です。Three.js博物館を追加。Node 22.23.4でビルドと24テストが成功し、ローカルWorkerの141ファイルにHTTP 200・CSP・no-transformを確認しました。全40件のパネル名とリンク、1440×900/390×844、写真の直接クリック、Tab循環、Escape、2D往復、3Dモジュール取得失敗時の検索を確認しています。

詳細: `PAPER_MUSEUM_20261102.md` / `museum-validation.json` / `MUSEUM_DESIGN_REVIEW_20261102.md`。iOS/Android実機、OS reduced-motion、実際のタッチ・文字拡大・読み上げは未確認です。

---
以下は過去の公開版の記録です。

> 最新0.3.0: Node標準テスト18/18、本番HTTP139/139。変更点・ブラウザ実操作・画像レビュー・残件はQUALITY_REVISION_20261102.md。以下は0.2.1時点の履歴。

# 検証記録 0.2.1 / 2026-11-02

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

## 公開後に見つかった差分

初回HTTP照合は136件中93件成功、43件のHTML本文だけ不一致。全HTTPステータス/バージョン/CSPは期待通り。差分を取得するとCloudflareの自動Web Analytics beacon追加だけだった。公式FAQ（https://developers.cloudflare.com/web-analytics/faq/ ）に従い、図鑑WorkerのCache-Controlにno-transformを指定する0.2.1を追加。ドメイン全体の解析設定や既存サイトの設定は変更していない。修正後の最終結果はproduction-http.json。

## 最終公開確認（2026-11-02）

0.2.1: HTTP136/136件成功。42ページと公開資産・既存トップ/制作/プライバシー・404・正規化を確認。図鑑の全200応答はローカル生成ファイルのSHA256と一致し、公開バージョン/CSPも一致。不要な外部スクリプトなしをDOMで確認。PC本番の川への切り替えとルリカケス詳細→実写、本番390pxで横はみ出しなしを確認。既存2Workerのバージョンと全ルートの対応は不変。cloudflare-verification.json参照。

採用素材を含むZIPを別ディレクトリに展開し、buildと15テストを実行して成功。認証情報・依存・Git・研究用原資料・参考動画は収録しない。


## 2026-11-02 / 0.4.0 360度の自然空間

現在の要望は展示室でなく、森・川・滝・海をつないだ360度の空間。古い部屋/スクロール案は履歴です。Node22ビルド成功、28テスト合格。CSP付きローカルWorkerで141公開ファイルのHTTP/ハッシュ確認成功。全40項目について解説名・実写の読み込み・詳細リンクを実ブラウザで確認し、選択時の位置に全40の名前マーカーが見えることも確認。

PC1280×800、スマホ390×844、横長844×390で水平オーバーフローなし。横長でも方向/拡大/退出ボタンが画面内。背景クリック拡大と回転の分離、＋/−の上限、矢印キー/ボタン、360度一周、Tab/ShiftTab/Escape/復帰、停止ボタン、図鑑検索・全40表示・森との往復を確認。ローカル503を意図的に返し、3D失敗後も40件の静的リンクと検索が使えることを確認。

実測は forest360-validation.json、forest360-browser.json、forest360-tests.log。iOS/Android実機、物理タッチ、低GPU、OS reduced-motion、スクリーンリーダー、200%文字拡大、実際のcontext lossは未確認。
