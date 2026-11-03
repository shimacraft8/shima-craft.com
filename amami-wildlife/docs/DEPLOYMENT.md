# 公開と復旧

公開先: https://shima-craft.com/wildlife/

## 対象の確認

- GitHub: `shimacraft8/shima-craft.com`（PUBLIC）。専用認証のログインが`shimacraft8`であることをAPIで確認。
- Cloudflare: `shimacraft8@gmail.com`。Account ID `42f69e35f08bb21dca5194467e2f59de`。
- Zone: `shima-craft.com` / `cdfc2875eb9e0bf217159ec8be376373`。
- 図鑑専用Worker: `shima-craft-amami-wildlife`。
- ルートはwwwの有無それぞれ`/wildlife`と`/wildlife/*`のみ。

専用認証の保存場所やトークンはリポジトリ/公開資産/ZIPに入れない。グローバルの認証を他のプロジェクトと共有・上書きしない。

## 配信内容

`public`のみをAssetsとして配信。研究用の第三者写真・PDF、生成PNG原画、ソースやdocsはHTTP公開しない。フロントエンドに秘密情報はない。外部API、Cron、D1、R2、有料サービス、新規解析タグを導入していない。実写は自サイトから配信し、ページ表示時にCommonsへ接続しない。

## 再公開

1. 対象アカウントとドメイン、既存Workerのバージョン・ルートを再確認して保存。
2. `npm ci` → `npm run build` → `npm test`（Node 22.23.4以上） → ブラウザーでPC/小画面/画像切り替えを確認。
3. 公開ディレクトリに認証情報・第三者の未許諾資料がないことを確認。
4. 専用認証を環境変数で選び、`wrangler deploy --dry-run --config wrangler.jsonc`。
5. `wrangler deploy --config wrangler.jsonc`。対象Worker名/Accountを再確認。
6. 公開HTML・写真・JS/CSS・404をHTTP確認し、既存トップ/制作サイトのWorkerバージョンとルートが変わっていないことを確認。

## 初回公開を戻す場合

新しく追加した`shima-craft-amami-wildlife`宛の4ルートだけを削除する。既存の`shima-craft.com/*`と`www.shima-craft.com/*`、既存Workerのバージョンには触れない。図鑑URLは既存サイト側の処理へ戻る。後続更新は図鑑Workerだけを既知のバージョンに戻す。`wrangler delete`等を他Workerへ実行しない。

公開前の既存Worker: homepage `213555b8-dc36-48fd-ae0b-2e62400fcccd`、legacy `117ff8f0-149d-4cfb-ae86-8a11aaf20c25`。公開後の結果は`release-result.json`を参照。

## 0.2.1の配信整合性

/wildlife/の応答にCache-Control: no-transformを付与。Cloudflareの自動beacon挿入をこの配信だけで抑止する。公式仕様: https://developers.cloudflare.com/web-analytics/faq/ 。CSPの許可範囲を広げない。既存ホームのWeb Analytics等のドメイン設定を変更しない。

## 最新版の復旧先

2026-11-02公開0.2.1: `03457d7e-0e36-4e6d-a2e6-1e8ce2429c5c`。直前0.2.0: `7bcfb932-ac30-4058-8015-3ab32a9e5aed`（自動beacon挿入あり）。初版0.1.0: `55128f9c-6a0a-4296-ac0b-26f4c7b80b25`。巻き戻しは図鑑Workerだけを対象にし、既存の2Workerには実行しない。初版へ戻すと追加画像や新演出は表示されない。

2026-11-02追補: 最新0.3.0のWorkerはe830c077-80a1-4cd3-a4b3-e6d1151040bc。直前0.2.1の03457d7e-0e36-4e6d-a2e6-1e8ce2429c5cへ戻すと、新しい図版/分類別一覧/アカウミガメは表示されない。対象は図鑑Workerのみ。


## 0.4.0 / 360度の森

公開Worker: `5461041d-601a-4c99-9235-74a45af46242`。公開前0.3.0の復旧先は `e830c077-80a1-4cd3-a4b3-e6d1151040bc`。専用認証を選び、図鑑のconfigで `wrangler rollback e830c077-80a1-4cd3-a4b3-e6d1151040bc --name shima-craft-amami-wildlife` を使用する。トップや制作サイトのWorkerへ実行しない。

デプロイ時は専用GitHub認証のshimacraft8とCloudflareのshimacraft8@gmail.comを確認。mainを変更せず図鑑専用ブランチをpushし、図鑑Workerだけをデプロイ。`--keep-vars`で既存変数を維持。公開後に145 HTTPチェック、全アセット内容、実ブラウザの描画/ズーム/参考写真、既存2 Worker/ルート不変を照合。

事前の直接API照合は一度403となった。Wranglerで公開は正常完了し、直後のwhoamiで同じメール/Account IDを確認、その後のAPI照合も成功した。資格情報の再入力や権限の拡張は行っていない。OAuthの値はログ/ソース/ZIPに出していない。

## 0.5.0 / 歩けるブロックの森と40種の立体モデル

公開Worker: `a1b72706-84fd-4e45-a126-608445e35bf7`。実装のGitHub記録は`356260eb09935a8a4d280c5c439a2c4977324683`（後続docsコミットあり）。既存2 Worker/全ルート不変をAPI照合、本番145 HTTPチェック成功。40種描画・本体クリック・写真・390px幅を本番ブラウザー確認。

復旧先は直前0.4.0の`5461041d-601a-4c99-9235-74a45af46242`。専用認証と図鑑configで`wrangler rollback 5461041d-601a-4c99-9235-74a45af46242 --name shima-craft-amami-wildlife`。図鑑以外のWorkerへ実行しない。

API照合で403になった後、通常のWrangler whoamiによる既存OAuth更新を行い、同じメール/Accountとバージョン/ルートの照合が成功。再ログインや権限の拡張は実施していません。

ZIPはscripts/package.pyで再生成。ソース/資料/許諾写真/選択した素材/プロトタイプを含み、認証情報/node_modules/研究用第三者メディアを除外。抽出後、Node22.23.4と既存npmキャッシュのみでnpm ci・ビルド・44テスト・モデル確認画面ビルドに成功。公開142ファイルが全件一致（voxel-zip-verification.json）。最終ZIPのSHA-256はZIPと同じoutputsフォルダの.sha256ファイルを参照。
