# SHIMA CRAFT / AMAMI LIFE Web公開記録 0.3.2

> 現行Web0.3.4: INFORMATION_HIERARCHY.md、research/hierarchy-v034/release.jsonを参照。構成と対象Worker/復旧手順は同じです。

> 現行Webは0.3.3。既存ロゴとPC向け配置を反映。最新検証はDESKTOP_UI_REVIEW.md、公開versionはresearch/desktop-v033/release.json。以下は0.3.2初回公開時の構成・復旧記録で、ルーティングと元Workerの保持方針は共通です。

2026-10-14 JST。ユーザーの明示指示でSHIMA CRAFTトップをWeb公開。iOS/Androidストア版は未公開・実機未確認です。

## 公開先と所有者

- URL: https://shima-craft.com/
- GitHub: shimacraft8 / shimacraft8/shima-craft.com
- ソース保存ブランチ: codex/amami-life-home-20261014、amami-life/ 以下（push結果は source-revision.json を参照）。mainの既存Nextコードは変更しません。
- Cloudflare本人: shimacraft8@gmail.com
- account: 42f69e35f08bb21dca5194467e2f59de
- zone: cdfc2875eb9e0bf217159ec8be376373
- 新Worker: shima-craft-amami-life
- 元Worker: shima-craft-com-production、元version: 117ff8f0-149d-4cfb-ae86-8a11aaf20c25

本人照会とzone所有者を確認済み。専用認証ディレクトリを使い、別プロジェクトのグローバル認証や既存の変更済みチェックアウトには触れていません。認証ファイルはこのプロジェクト・ZIP・Gitに含めません。

## 構成と既存ページ

トップ / はAMAMI LIFE、元の制作案内トップは /studio。制作サービス・制作例・費用・相談は /studio#service、#works、#price、#contact へ。旧 /#contact 等の7種アンカーは /studio の対応位置へ転送します。

既存の /services、/amami-tide、/privacy、/about、/amami-dialect、/system-samples、/web-check などは新Workerから元WorkerのService Bindingへそのまま渡します。元Workerのデプロイ・Custom Domain・既存Nextソースは変更していません。POST本文・Cookie保持も自動試験済み。フォーム送信や会員ログインの本番操作は未実施です。

新資産は /amami-life/、APIは /amami-life-api/。ルートService Workerを登録せず、既存サイトのキャッシュを横取りしません。公開版にはQA切替・ダミー気温・仮の警報状態を出しません。

## データと制約

名瀬・笠利・古仁屋の気象庁実況気温、奄美地方の地域予報をCloudflareから取得。redirect:error がCloudflare未対応だった問題を manual＋非2xx拒否で解消。成功キャッシュの元時刻を維持し、古い・失敗・未取得を区別します。キャッシュはWorkerメモリで永続ではありません。SLAや常時監視・長期履歴は未整備です。

潮は名瀬小湊O9の2026年保存済み天文予測だけ。実況ではなく、他地域へ流用しません。太陽はSunCalcの参考計算。警報・地震・津波・台風・熱帯低気圧の現在状態は未統合で公式リンクへ案内。全TD網羅や安全保証を謳いません。交通は公式ページへのリンク主体、未確認事業者の電話帳は公開しません。

メモ・保存・地域・テーマはブラウザ内保存。再読み込みと最新情報には通信が必要。Web公開はネイティブアプリ公開と別です。Expo開発依存で過去の監査29件が未解決で、今回包括的なセキュリティ監査を完了したとはしません。

## 検証

全78件の単体/HTTP試験、Lint、strict型検査、公開ビルド成功。Cloudflare事前環境と本番URLそれぞれ20項目のHTTP検証。追加の制作例/業務サンプル/会員案内/wwwの10リンクもHTTP200（会員機能操作は未検証）。観測気温・予報・潮の実データ取得を本番ブラウザでも確認。

ブラウザ8サイズ: 320×667、375×667、390×844、430×932、768×1024、1024×768、1280×720、1440×900。標準文字の通常表示で横はみ出しなし、次の潮/日の入りが下部タブに隠れないことを測定。朱と和紙/墨と金、5タブ、地域変更、検索、メモ再読込、制作メニュー/FAQ、旧 /#contact → /studio#contact の遷移を確認。初回の旧アンカーが今日タブに吸収される問題はURL更新前に転送する方式へ修正。最新公式Web Interface Guidelinesに沿ってラベル・フォーカス・ネイティブ操作・reduced motion等をレビュー。実機Safari/Android Chrome、OS文字200%、VoiceOver/TalkBack、フォーム実送信、会員権限は未確認です。

証跡: research/shimacraft-publication/。公開前の応答はbefore-routes.json、最終版はpublic-http.json、Cloudflare構成はproduction-state.json。画面はpublic-home-pc.png / public-home-mobile.png / public-home-ink.png。

## 再公開

Node/npmとロックファイルから依存を復元し、npm run web:build、npm test、npm run lint、npm run typecheck。wrangler.jsonc の固定account/zone/Service Bindingを確認して専用認証で wrangler deploy --config wrangler.jsonc。node scripts/verify-web-release.mjs https://shima-craft.com で公開後確認。ソースのpushだけではこのWorkerは更新されません。

認証の例（値は本人が準備したディレクトリ）:

```sh
SHIMA_AUTH_DIR="専用認証ディレクトリの絶対パス"
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_API_KEY XDG_CONFIG_HOME="$SHIMA_AUTH_DIR/cloudflare" WRANGLER_SEND_METRICS=false wrangler deploy --config wrangler.jsonc
```

## 復旧

新Workerへの2本のrouteだけを外すと、元WorkerのCustom Domainが再びトップを応答します。元Workerを再デプロイしません。scripts/rollback-home.py はemail/zone/accountを再検査し、新Workerの対象2route以外を削除しません。

```sh
XDG_CONFIG_HOME="$SHIMA_AUTH_DIR/cloudflare" python3 scripts/rollback-home.py
# 上記の対象2件を確認してから復旧を実行
XDG_CONFIG_HOME="$SHIMA_AUTH_DIR/cloudflare" python3 scripts/rollback-home.py --execute
```

削除復旧は今回は未実行。以後は公式データ鮮度・リンク・2027年潮データ・利用量を定期確認する担当/周期を決める必要があります。通知監視や自動課金契約は追加していません。
