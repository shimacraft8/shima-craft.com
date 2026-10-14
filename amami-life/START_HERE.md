# AMAMI LIFE：ここから再開

Web版0.3.4を2026-10-14、ユーザーの明示承認で https://shima-craft.com/ に公開しました。iPhone/Androidストア版は0.3.1の土台で、未公開・実機未確認です。

1. docs/INFORMATION_HIERARCHY.md、docs/DESKTOP_UI_REVIEW.md、docs/CODEX_TASK.md、docs/SHIMACRAFT_WEB_RELEASE.md、docs/DEVELOPMENT_REPORT.mdを読む。
2. 原依頼資料はdocs/specification/。更新済み状況と区別する。
3. 朱と和紙/墨と金のフォント・余白・繊細な質感・日輪と墨雲の世界観を維持する。

GitHub shimacraft8、Cloudflare shimacraft8@gmail.comの本人・ドメイン所有を確認し、不一致は専用認証で解消済み。新Worker shima-craft-amami-life がトップを担当し、既存ページは元Workerを保持。既存の変更済みチェックアウトは読み取り専用のまま、クリーンな別cloneの専用ブランチに新ソースを保存済み。公開範囲・再公開・復旧の詳細は公開記録へ。別プロジェクトの公開・ストア提出・課金は未承認です。

確認済み: 全82試験、Lint/strict型検査、ブラウザ9画面サイズ、本番の観測/予報/潮取得と既存ページのHTTP接続。iOS/Android実機、読み上げ、OS文字拡大、会員ログイン/フォーム実送信は未確認。

警報/津波/台風の常時統合、全TD網羅、POI/事業者電話帳、通知は未完成。Expo開発依存の既知警告29件は未解決。Webの再読み込みには通信が必要です。

ローカル確認はREADME.md、iPhone優先の次の試験はdocs/DEVICE_QA.md。npm run packageでソース/素材/仕様/証跡をZIP化し、依存/Git/秘密設定/.wranglerを除外。ZIPは署名済みスマートフォンアプリではありません。
