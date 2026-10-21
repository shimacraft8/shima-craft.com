> Web0.3.9公開済み：太陽/月の初期地図を島を見渡す縮尺へ。docs/MAP_DEFAULT_WEB_RELEASE.mdの公開結果参照。

> 2026-10-21 Web0.3.8公開済み：https://shima-craft.com/ 。太陽/月の地図を通常カラーへ変更。docs/STREET_MAP_WEB_RELEASE.md参照。公開結果は同書末尾。

> 2026-10-21 Web0.3.7公開済み：https://shima-craft.com/ 。地点選択・拡大地図と公式台風進路図。docs/MAP_INTERACTION_WEB_RELEASE.md参照。公開結果は同書末尾。旧版記録と区別。

> 最新公開：2026-10-20 Web 0.3.6。docs/ISLAND_TOOLS_WEB_RELEASE.md（docs内はISLAND_TOOLS_WEB_RELEASE.md）参照。方位図/潮位選択/台風/空港埋め込み/不要欄削除を公開済み。以下に旧版の時点記録も含みます。

# 続行時の作業指示

ユーザーの最終目標は、旅行者と島民が日常利用できるiPhone/Android向け一般公開アプリです。Web0.3.5は黒金でSHIMA CRAFTトップへ公開済み。最新のBLACK_GOLD_WEB_RELEASE.mdを参照。iOS/Androidストア版は未公開。まずSHIMACRAFT_WEB_RELEASE.mdを読み、WebとNativeの状況を区別します。

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


2026-10-15：管理者解析画面 `/admin/analytics` をローカル追加。**未公開・pushなし**。公開中Webは0.3.4のままです。`docs/analytics/README.md`（docsからはanalytics/README.md）を参照。GA4数字ID/ストリームID/GSC対象/サービスアカウント/Access未設定で、Google実データ照合は未完了です。計測追加は既定でOFF。Google設定や公開を完了済みと扱わないでください。


2026-10-20：Apple Design Skill参照のHP改修候補をローカル実装。和紙/朱・墨/金・既存フォント/日輪は保持。PC上部/スマホ下部のナビ、余白、地域/日付/検索/ダイアログを調整。`docs/APPLE_DESIGN_REFINEMENT.md` を参照（docs内からはAPPLE_DESIGN_REFINEMENT.md）。プレビューは `npm run home:preview` → http://127.0.0.1:4914/ 。**本番デプロイ・pushなし。公開中Web0.3.4と区別。**


2026-10-20追補：文字・アニメーション・構成も見直してよいというユーザー指示で、Webの字体をシステムサンセリフへ統一し、今日の要約→行動入口→詳細の順に再構成しました。前段の「既存フォント保持」は第1版の説明です。最新は `docs/USER_JOURNEY_REFINEMENT.md`（docs内からはUSER_JOURNEY_REFINEMENT.md）。全118テスト、ビルド/Lint/型検査成功。プレビュー http://127.0.0.1:4914/ 。**本番未反映・pushなし。実機未確認。**


2026-10-20 最新公開：Web 0.3.5を https://shima-craft.com/ へ公開。HPは黒金に固定し、背景・質感を全体で統一、既存の白文字＋赤い波を使用。文字・導線・動きの前段改修も反映。公開はGitHub shimacraft8/shima-craft.comの専用ブランチとCloudflare shimacraft8@gmail.comの対象Workerを照合して実施。管理者解析・Google連携・計測追加とNativeは未公開。公開記録はdocs/BLACK_GOLD_WEB_RELEASE.md（docs内からはBLACK_GOLD_WEB_RELEASE.md）。開発全体118試験、公開HP専用87試験、公開HTTP19項目成功。実機未確認は継続。
