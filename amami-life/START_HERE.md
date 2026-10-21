> Web0.3.9公開済み：太陽/月の初期地図を島を見渡す縮尺へ。docs/MAP_DEFAULT_WEB_RELEASE.mdの公開結果参照。

> 2026-10-21 Web0.3.8公開済み：https://shima-craft.com/ 。太陽/月の地図を通常カラーへ変更。docs/STREET_MAP_WEB_RELEASE.md参照。公開結果は同書末尾。

> 2026-10-21 Web0.3.7公開済み：https://shima-craft.com/ 。地点選択・拡大地図と公式台風進路図。docs/MAP_INTERACTION_WEB_RELEASE.md参照。公開結果は同書末尾。旧版記録と区別。

> 最新公開：2026-10-20 Web 0.3.6。docs/ISLAND_TOOLS_WEB_RELEASE.md（docs内はISLAND_TOOLS_WEB_RELEASE.md）参照。方位図/潮位選択/台風/空港埋め込み/不要欄削除を公開済み。以下に旧版の時点記録も含みます。

# AMAMI LIFE：ここから再開

> 最新：Web0.3.5を黒金のみで公開済み。docs/BLACK_GOLD_WEB_RELEASE.mdを参照。管理者解析とNativeは未公開。以下には過去版の記録も含まれます。

Web版0.3.4を2026-10-14、ユーザーの明示承認で https://shima-craft.com/ に公開しました。iPhone/Androidストア版は0.3.1の土台で、未公開・実機未確認です。

1. docs/INFORMATION_HIERARCHY.md、docs/DESKTOP_UI_REVIEW.md、docs/CODEX_TASK.md、docs/SHIMACRAFT_WEB_RELEASE.md、docs/DEVELOPMENT_REPORT.mdを読む。
2. 原依頼資料はdocs/specification/。更新済み状況と区別する。
3. 朱と和紙/墨と金のフォント・余白・繊細な質感・日輪と墨雲の世界観を維持する。

GitHub shimacraft8、Cloudflare shimacraft8@gmail.comの本人・ドメイン所有を確認し、不一致は専用認証で解消済み。新Worker shima-craft-amami-life がトップを担当し、既存ページは元Workerを保持。既存の変更済みチェックアウトは読み取り専用のまま、クリーンな別cloneの専用ブランチに新ソースを保存済み。公開範囲・再公開・復旧の詳細は公開記録へ。別プロジェクトの公開・ストア提出・課金は未承認です。

確認済み: 全82試験、Lint/strict型検査、ブラウザ9画面サイズ、本番の観測/予報/潮取得と既存ページのHTTP接続。iOS/Android実機、読み上げ、OS文字拡大、会員ログイン/フォーム実送信は未確認。

警報/津波/台風の常時統合、全TD網羅、POI/事業者電話帳、通知は未完成。Expo開発依存の既知警告29件は未解決。Webの再読み込みには通信が必要です。

ローカル確認はREADME.md、iPhone優先の次の試験はdocs/DEVICE_QA.md。npm run packageでソース/素材/仕様/証跡をZIP化し、依存/Git/秘密設定/.wranglerを除外。ZIPは署名済みスマートフォンアプリではありません。


2026-10-15：管理者解析画面 `/admin/analytics` をローカル追加。**未公開・pushなし**。公開中Webは0.3.4のままです。`docs/analytics/README.md`（docsからはanalytics/README.md）を参照。GA4数字ID/ストリームID/GSC対象/サービスアカウント/Access未設定で、Google実データ照合は未完了です。計測追加は既定でOFF。Google設定や公開を完了済みと扱わないでください。


2026-10-20：Apple Design Skill参照のHP改修候補をローカル実装。和紙/朱・墨/金・既存フォント/日輪は保持。PC上部/スマホ下部のナビ、余白、地域/日付/検索/ダイアログを調整。`docs/APPLE_DESIGN_REFINEMENT.md` を参照（docs内からはAPPLE_DESIGN_REFINEMENT.md）。プレビューは `npm run home:preview` → http://127.0.0.1:4914/ 。**本番デプロイ・pushなし。公開中Web0.3.4と区別。**


2026-10-20追補：文字・アニメーション・構成も見直してよいというユーザー指示で、Webの字体をシステムサンセリフへ統一し、今日の要約→行動入口→詳細の順に再構成しました。前段の「既存フォント保持」は第1版の説明です。最新は `docs/USER_JOURNEY_REFINEMENT.md`（docs内からはUSER_JOURNEY_REFINEMENT.md）。全118テスト、ビルド/Lint/型検査成功。プレビュー http://127.0.0.1:4914/ 。**本番未反映・pushなし。実機未確認。**


2026-10-20 最新公開：Web 0.3.5を https://shima-craft.com/ へ公開。HPは黒金に固定し、背景・質感を全体で統一、既存の白文字＋赤い波を使用。文字・導線・動きの前段改修も反映。公開はGitHub shimacraft8/shima-craft.comの専用ブランチとCloudflare shimacraft8@gmail.comの対象Workerを照合して実施。管理者解析・Google連携・計測追加とNativeは未公開。公開記録はdocs/BLACK_GOLD_WEB_RELEASE.md（docs内からはBLACK_GOLD_WEB_RELEASE.md）。開発全体118試験、公開HP専用87試験、公開HTTP19項目成功。実機未確認は継続。
