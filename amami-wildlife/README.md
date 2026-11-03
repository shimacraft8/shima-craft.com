# 奄美大島の生き物大全 / 0.6.0

森・渓流・海をめくる自然絵本と、名前や分類で探す図鑑。白い紙面、大きな日本語ゴシック、新規の風景画と既存の透過イラストを組み合わせました。表紙を開き、ドラッグ・スワイプ・キー・前後ボタンで景色をめくります。

公開先: https://shima-craft.com/wildlife/
公開済みバージョンと検証結果は [release-result.json](docs/release-result.json) を参照。

## 起動と更新

Node.js 22.23.4以上とPython 3が必要です。

```sh
npm ci
npm run build
npm test
npm run preview
```

http://127.0.0.1:4926/wildlife/ を開きます。ビルド済みファイルの閲覧だけなら `python3 -m http.server 4926 --bind 127.0.0.1 --directory public`。`/wildlife/` を付けてください。

## 体験

- 表紙→森→渓流→海→巻末を横にめくる一冊の絵本。章ナビから直接移動。
- 生き物を選ぶと3ページの本が開きます。1 イラスト、2 実際の写真、3 生態と出典。
- タブ、前後ボタン、左右キー、横スワイプで切り替え。縦スクロールとピンチを妨げません。
- 閉じる/Escapeで元の場所へ。生き物/写真/解説のURLを共有できます。
- 図鑑は分類群ごとに整理。名前・学名、島、すみか、渡り鳥で絞り込めます。
- 動きの停止・OSの動きを減らす設定に対応。JavaScriptやデータ取得の失敗時も通常の詳細リンクが残ります。
- SHIMA CRAFT/AMAMI LIFEへの動線はヘッダー・フッターに維持。

## 構成

- `src/storybook/`: 軽量なページめくり・奥行き・生き物の本の操作。トップはWebGLやThree.jsを読み込みません。
- `scripts/storybook.py`: 静的な絵本とアクセシブルなダイアログを生成。
- `scripts/build-storybook.mjs` / `scripts/build.py`: JSのバンドル、HTML・公開JSON・サイトマップの生成。
- `data/species.json`: 出典付きの編集済み40項目。種・亜種を含みます。
- `data/photos.json`: 許諾・写真注記・原典URLを確認した実写40点。
- `data/story-scenes.json`: 場面と主役/関連する生き物。
- `data/story-art.json` / `assets/storybook/`: 新規風景画の台帳とPNG原画。
- `data/checklist-records.json`: 文献抽出1,179記録。未照合であり確定種数ではありません。
- `data/requested-taxa.json`: ユーザー指定248名称。未編集・未照合を区別します。
- `public/wildlife/`: HTTPで配信するファイルのみ。
- `worker.mjs` / `wrangler.jsonc`: 図鑑専用のCloudflare配信と安全なヘッダー。
- `tests/`: 現行機能、データ・リンク・配信、過去の3D形状の回帰試験。
- `src/museum/` / `prototypes/`: 以前の3D案の保管。現行サイトでは実行しません。
- `design-system/MASTER.md` / `docs/STORYBOOK_20261103.md`: 現行の設計・検証・制約。

## 収録範囲と制約

対象地域は奄美群島全体。編集済み40項目にイラストと実写を収録しています。全動物の網羅、未編集候補の全イラスト化、専門家による形態・分類・写真同定の監修は未完了です。風景画は創作で、実在地点・分布・季節・昼夜・縮尺を再現していません。野外での同定や安全判断には使わないでください。

実写には標本・飼育個体・亜種未確認の写真もあり、各写真に注記と出典を表示します。iOS/Androidの実機・実タッチ/マルチタッチ・VoiceOver/TalkBackは未確認です。ブラウザーの小画面検証と区別してください。

## 公開・復旧・ZIP

[公開手順](docs/DEPLOYMENT.md)。GitHubは `shimacraft8/shima-craft.com`。CloudflareはSHIMA CRAFT専用アカウント、Worker `shima-craft-amami-wildlife` の `/wildlife` と `/wildlife/*`（www含む）だけを更新します。既存トップ・制作サイトのWorker/ルートを変更しません。認証情報はプロジェクト外に置きます。

`python3 scripts/package.py` で `../amami-wildlife-project.zip` を作成。ソース、採用素材/原画、写真、データ、デザイン、テスト・公開記録を収録。認証情報、node_modules、Git、研究用の第三者原画像/PDFは除外します。過去版の設計はdocsの各履歴報告に保存しています。
