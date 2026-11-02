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
2. `python3 scripts/build.py` → `node --test tests/*.test.mjs` → ブラウザーでPC/小画面/画像切り替えを確認。
3. 公開ディレクトリに認証情報・第三者の未許諾資料がないことを確認。
4. 専用認証を環境変数で選び、`wrangler deploy --dry-run --config wrangler.jsonc`。
5. `wrangler deploy --config wrangler.jsonc`。対象Worker名/Accountを再確認。
6. 公開HTML・写真・JS/CSS・404をHTTP確認し、既存トップ/制作サイトのWorkerバージョンとルートが変わっていないことを確認。

## 初回公開を戻す場合

新しく追加した`shima-craft-amami-wildlife`宛の4ルートだけを削除する。既存の`shima-craft.com/*`と`www.shima-craft.com/*`、既存Workerのバージョンには触れない。図鑑URLは既存サイト側の処理へ戻る。後続更新は図鑑Workerだけを既知のバージョンに戻す。`wrangler delete`等を他Workerへ実行しない。

公開前の既存Worker: homepage `213555b8-dc36-48fd-ae0b-2e62400fcccd`、legacy `117ff8f0-149d-4cfb-ae86-8a11aaf20c25`。公開後の結果は`release-result.json`を参照。

## 0.2.1の配信整合性

/wildlife/の応答にCache-Control: no-transformを付与。Cloudflareの自動beacon挿入をこの配信だけで抑止する。公式仕様: https://developers.cloudflare.com/web-analytics/faq/ 。CSPの許可範囲を広げない。既存ホームのWeb Analytics等のドメイン設定を変更しない。
