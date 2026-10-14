# 続行時の作業指示

ユーザーの最終目標は、旅行者と島民が日常利用できるiPhone/Android向け一般公開アプリです。Web0.3.4はSHIMA CRAFTトップへ公開済み。iOS/Androidストア版は未公開。まずSHIMACRAFT_WEB_RELEASE.mdを読み、WebとNativeの状況を区別します。

まず `../START_HERE.md` と本書、`DEVELOPMENT_REPORT.md` を読み、原仕様は `specification/CODEX_TASK.md` 以下を参照してください。ユーザーの最新の明示指示を優先します。

- B「朱と和紙」/C「墨と金」を維持。`ui-ux-pro-max` と `web-design-guidelines`、`../design-system/MASTER.md`、共通tokens/部品を使う。機能追加でカード/丸角/グラデーションの別世界を持ち込まない。
- `NEXT_ROADMAP.md` のP0から小さく実装・検証。公式の予報/観測/年次予測/実発表/現在状態を区別する。
- 大きな気温は3地点の公式アメダス実況へ置換済み。日輪は島の装飾。品質0のみ、観測/取得/20分鮮度、過去未来への流用抑止を維持。
- 現行防災はunknown。実XML検証と、全件取込・区域別初期状態/取消/解除/停止監視の完成を混同しない。
- 発達前TDの全網羅を謳わない。TD階級だけで発達見込みと判定しない。海外情報は条件/定義を調査してから採否を判断。
- 既存の変更済みSHIMA CRAFTチェックアウトは読み取り専用。ユーザーの明示承認で新Workerを公開済み。別プロジェクト・ストア・課金・配布へ承認を拡張しない。
- GitHub shimacraft8、Cloudflare shimacraft8@gmail.comを専用認証で本人確認済み。グローバル認証を変更せず、再公開前もaccount/zone/repo所有者を再確認。
- 公開番号だけを根拠に事業者を確認済みとしない。番号/継続営業/掲載確認を終えるまで直接電話帳を公開しない。外部への問い合わせ送信は別途明示指示後。
- `npm run typecheck`、`npm run lint`、変更に対応した試験、Web画面検証を実施。iOS/Android実機未確認は正直に残す。
- `DEVICE_QA.md`、`PUBLICATION_RUNBOOK.md`、出典台帳、テスト証跡、未解決課題を更新。終了時は `npm run package` でZIPを再生成して整合性を確認。

依存警告をSDKの無検証ダウングレードで消さない。秘密鍵/トークンをログ・バンドル・ZIPへ含めない。承認済みローカル作業は不要な再確認で止めず、正確な実装/未実装の区別を守って進めます。

0.3.0で初版のストア準備を追加。`STORE_RELEASE.md` と `STORE_METADATA.md` を読み、ストア未登録・Native API/窓口設定未確定・依存29件・実機未確認を公開阻害事項として残します。公開ビルドの必須設定をダミー値で回避しません。

0.3.1：ユーザーはiPhoneから開始し、利用者操作を重視。USABILITY_REVIEW_IPHONE.mdを最初に読む。ホーム要約/次の潮/日付復帰/検索/メモ自動保存/地域ダイアログ/発表時刻判定を維持。71試験とExpo Web実操作を実機試験と混同しない。

0.3.3：ユーザー指定の既存SHIMA CRAFTロゴを再利用。PCはフル幅/上部ナビ/天気と潮・太陽の並列、一覧は2列。スマホ下部5タブは維持。DESKTOP_UI_REVIEW.mdとresearch/desktop-v033を参照し、スマホ枠をPCへ戻さない。

0.3.4：重要な天気/時刻を太く大きくし、補足と出典を分離。満干潮別の次時刻/翌日表示、公式毎時予測グラフ、潮と夕日の7日一覧。INFORMATION_HIERARCHY.md参照。実測や安全な活動時間と混同しない。82試験。
