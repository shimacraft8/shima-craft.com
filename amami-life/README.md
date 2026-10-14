# AMAMI LIFE — Web公開版 0.3.2 / Native開発版 0.3.1

添付リファレンスの和紙、朱の日輪、墨の雨雲、金の夜を基にした操作可能な5画面と、Expo SDK 57 / TypeScriptのアプリ土台です。**Web版は https://shima-craft.com/ に公開済み。iOS/Androidストア版は未公開・実機未確認です。**

最新の構成・検証・再公開・復旧は [SHIMA CRAFT Web公開記録](docs/SHIMACRAFT_WEB_RELEASE.md)。

- [デザイン比較](design/review.html) / [開発・検証レポート](docs/DEVELOPMENT_REPORT.md)
- [旧コード監査](docs/LEGACY_AUDIT.md) / [データソース確認台帳](docs/DATA_SOURCE_REGISTRY.csv)
- [次の開発順序](docs/NEXT_ROADMAP.md) / [実機確認手順](docs/DEVICE_QA.md) / [公開手順](docs/PUBLICATION_RUNBOOK.md)
- [APIと構成](docs/ARCHITECTURE.md) / [タスク一覧](docs/TASKS.md) / [公開前の未決事項](docs/RELEASE_GATES.md)

[初版のストア公開準備・登録・公開後の更新](docs/STORE_RELEASE.md) / [掲載文の下書き](docs/STORE_METADATA.md)

## iPhone向けアプリ版をMacで確認

`アプリ確認起動.command` をダブルクリック。初回は依存の `npm ci` が必要です。起動中はターミナルを開いたまま、[アプリ版プレビュー](http://localhost:4901/)をこのMacのブラウザで開きます。公開/外部配布はしません。iPhone実機で開くURLではありません。

[利用者操作の結果と改修](docs/USABILITY_REVIEW_IPHONE.md)。ホームの予報・雨の確率・次の潮、普段の言葉での検索、メモ自動保存、地域の素早い変更を追加しました。

## 通常Web試作のローカル起動

Macでは `プレビュー起動.command` をFinderからダブルクリックして起動できます。初回の依存インストール（`npm ci`）後に使用してください。閲覧中は起動したターミナルを開いたままにします。Mac再起動やサーバー停止後は再度起動が必要です。URLはこのMacのブラウザで開きます。

Node.js 24 LTS以上を推奨（サーバーはTypeScriptを直接読み込みます）。今回の検証はNode 25.9.0 / npm 11.12.1。依存はロックファイルに固定しています。

```bash
cd amami-life  # ZIPを展開した場所、または本プロジェクトの場所で実行
npm ci
PORT=4837 npm start
```

[ローカルプレビュー](http://localhost:4837/) / [比較ギャラリー](http://localhost:4837/design/review.html)

`localhost`へのみ待ち受けます。APIや依存のインストールには外部公開操作は含みません。Web版をHTMLファイルとして直接開くとモジュール/APIが動かないので、上記サーバーを使用してください。

```bash
# 共通ロジック・HTTP統合試験
npm test
npm run typecheck
npm run lint

# Expo共通アプリ
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=http://localhost:4837 EXPO_NO_TELEMETRY=1 npx expo start --localhost

# ローカルでJS/Hermes/Webを生成（署名・配布ではない）
EXPO_PUBLIC_API_BASE_URL=http://localhost:4837 EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx expo export --platform all --output-dir ../../design/native-web
```

Expo Go等での端末確認は未実施です。SDK対応のExpo Goまたは開発ビルドを準備してください。クラウドビルド・EAS登録・配布・公開は別途承認が必要です。

## 今使えるもの

5タブ、3地点の手動選択、日付切替、地点別太陽参考計算、名瀬小湊O9の2026年天文潮位予測、公式情報検索、交通・防災への外部リンク、リンク保存、旅のメモ、昼夜テーマ、通信失敗等の表示。ネイティブ版の端末保存はSQLite、Web版はlocalStorageです。

大きな気温は名瀬88837・笠利88821・古仁屋88901の公式アメダス観測です。観測所と観測/取得時刻を表示し、品質0のみ、10分メモリキャッシュ、観測20分後は古い表示。過去・未来の日付には現在値を流用しません。日輪・墨雲は島の意匠で、天気の実況ではありません。その下の「気象庁の地域予報」は公式実データで、天気文・風・波・時間別降水確率・週間の名瀬気温を表示します。地域予報は地点の実況ではありません。サーバーは必要時に固定の公式URLを取得し、1時間キャッシュ。混在する発表の最古時刻から6時間で一部が古い可能性を表示し、失敗時は最後の成功キャッシュと元の取得時刻を保持します。

地震・津波・台風・気象警報の自動取得、プッシュ通知、POI地図、確認済み事業者電話帳は未実装です。全ての熱帯低気圧を網羅しません。未取得を安全と判定しません。

## 作業境界

ユーザーの明示承認でCloudflare公開。GitHub shimacraft8、Cloudflare shimacraft8@gmail.comの本人と対象ドメインを確認済み。既存の変更済みチェックアウトは編集せず、新Workerとクリーンな別cloneの専用ブランチを使用します。既存Workerを保持し、制作案内は /studio へ接続。ストア登録・課金・事業者への送信は未実施です。

## データ・素材

潮汐の取得証跡は `server/data/tide-provenance.json`。2026年O9公式テキストと旧保存データがバイト単位で一致。時刻のゼロ埋め・欠損・地点流用・翌日補間の問題を新実装で扱っています。年次予測の発表時刻は不明で、実況として表示しません。

図柄と紙テクスチャは編集可能な独自実装。景観写真・地図タイル・外部Webフォントは使用していません。システムフォントは再配布していません。調査用のUI Pocketスクリーンショットはアプリバンドルに含めません。

依存監査の29件（18 high / 11 moderate、4件の直接アドバイザリとその依存連鎖）は未解決です。詳細はレポート参照。修正版なしの依存を含み、ネイティブ版の公開可否は未確定です。Webは範囲を絞って公開済みで、包括的な安全性保証ではありません。

## 引き継ぎとZIP

ソース・独自素材・共通色トークン・資料・実データfixture・テスト証跡を同梱します。`npm run package` で上位outputsへZIPとSHA-256/検証結果を生成できます。node_modules、Git履歴、.expo、秘密設定・鍵は除外し、`npm ci` で依存を復元します。ZIPは署名済みのスマートフォン用インストーラーではありません。

```bash
# 保存済み公式XML 5種の解析。ネットワークアクセスなし
npm run inspect:jma
# 公式Atomと種類別サンプルを一度取得してローカル解析
node scripts/inspect-jma.mjs --fetch
# ソース一式を梱包・内部ハッシュ検証
npm run package
```

XML解析は種類/区域/発表/訂正/取消の検証用です。実配信の常時取込、現在警報の確立、通知配信は未実装です。検証用ダウンロードを現在の安全判定として表示しません。
