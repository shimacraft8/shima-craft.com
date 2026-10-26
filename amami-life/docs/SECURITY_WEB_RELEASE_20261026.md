# 2026-10-26 セキュリティ改修のWeb反映

ユーザーの本番変更・GitHub pushの明示指示に基づく公開記録です。過去の「未公開」は各記録日の状態です。

## 対象と公開範囲

- URL: https://shima-craft.com/
- GitHub: `shimacraft8/shima-craft.com`、専用ブランチ `codex/security-hardening-20261022`。mainへのmergeは行いません。
- Cloudflare: `shimacraft8@gmail.com`、account `42f69e35f08bb21dca5194467e2f59de`、zone `cdfc2875eb9e0bf217159ec8be376373`。
- 更新Worker: `shima-craft-amami-life`。Version `39656689-fb45-43ed-b8f8-8ac87a34aedc`。
- 旧サービス `shima-craft-com-production` はVersion `117ff8f0-149d-4cfb-ae86-8a11aaf20c25` のままです。

公開したのはHP専用Workerと23個の公開素材です。APIの有界レート制限、HEAD応答、HSTS/Permissions-Policy等の防御を反映しました。レート制限はisolate単位の補助制限で、全世界共通の割当ではありません。既存の黒金デザイン・出典・キャッシュ/未取得/古い状態の区別を維持しています。管理者解析・追加計測・Nativeを配信素材に含めていません。

検証済みcompiled ZIPのSHA-256: `4b7cace8e5afa145bee63d2346316d07fa877a4432b6d316a1b40e25952fb5d5`。全26エントリのCRC・manifest記載25ファイルのhashを再確認し、新規ディレクトリへ復元してWrangler dry-run後に配信しました。worker/source候補のcommitは `9d2ebc1c813ab7dd3d80751850b41f9da1dbc322`、以後の記録更新は配信コードを変更しません。

## 確認結果と制限

公開後のHTTP確認40項目が成功しました。トップ・既存8経路、公開23素材、気温/潮/防災unknown/地域別の未対応潮位、解析関連3経路の404を確認しました。JS/CSS/画像等21素材は公開応答のhashとmanifestを照合し、HTMLはCloudflareの変換を考慮して識別・安全ヘッダーを確認しています。既存ページは直前取得したタイトル・HTTP状態と照合しました。

本番のrouteパターン・Worker割当・fail-open=false、bindings、compatibility設定が維持されたことをAPIで確認しました。WranglerがrouteのレコードIDを再生成したため、ID自体の同一性は主張しません。変更前後で意味が同じことを比較しています。

ブラウザでは太陽→月切替、月の出入り時刻と方位、地図表示、台風の保存情報表示を確認しました。台風リストは取得できましたが、古い発表を含むためAPIは `stale`、画面は保存情報の注意を表示しました。HTTP成功を全情報の鮮度正常と扱いません。実機・実メール・会員認証・privateデータ復元・本番rollback実行は未確認です。

先行ローカル検証は公開HP113テスト、旧Next候補252テスト・型・lint・Next build、復元compiled artifact5チェックです。2つのTCP親試験はネットワーク隔離のため除外した記録のままです。

## 旧サービスと本人側に残る作業

今回、両Workerの配信コードをAPIから取得し、秘密を含み得る復旧資料としてGit外のローカル限定領域に保存しました。以前の401/405は現在の取得結果と区別します。旧サービスにはOpenNextの実装があり、履歴上の移行ブランチにも設定がありますが、改修候補と同じsource/buildであることは確定していません。候補が必要とするFirebase/Groq/Turnstileのbindingも現行設定にありません。そのため、旧Next・フォーム・CMS等の改修はブランチ上の候補です。対応するadapter build、必要な鍵と本人管理inboxでの受入を終えてから旧サービスへ反映します。

CloudflareのMFAは10/26の読取でも無効でした。本人による認証要素と回復手段の登録が必要です。APIの認証情報をGitや資料へ転記していません。private DB/CMSのexport、暗号化した別媒体backup、障害通知先・常時監視は未完了です。

## 復旧

直前正常版: `ff8a38bb-706c-4747-b2b5-bcf3b90fa2e0`。Cloudflareが保持する過去Versionと、変更前のcompiled source・公開素材・設定metadata・hashを保全しました。取得したWorkerコードは単体でstatic assetsやprivateデータを全て復元するものではありません。

対象専用認証を指定して、必要時に次を実行します（今回は実行していません）。

```sh
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_API_KEY \
  XDG_CONFIG_HOME="/Users/hiroshikento/Documents/Codex/2026-10-13/start-here-md-docs-codex-task/work/shima-release-auth/cloudflare" \
  wrangler rollback ff8a38bb-706c-4747-b2b5-bcf3b90fa2e0 \
  --name shima-craft-amami-life
```

Versionのrollbackは関連DB等を巻き戻しません。公式の[rollback仕様](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)を参照し、実行前後にroute/bindingsと利用者向けの応答を確認してください。
