# 奄美大島の生き物大全 / SHIMA CRAFT

公開先: https://shima-craft.com/wildlife/

対象は奄美群島全体の動物全般。初公開版0.1.0は編集済み39項目（種・亜種）・透過イラスト5点・風景1点・再利用許可を確認した実写30点。全動物の網羅、全種のイラスト制作は未完了。文献からの抽出1,179記録は重複・未同定を含む未照合の候補であり、種数ではありません。

## ローカルで見る

Python 3とNode.js 22.23.4以上を使用。実行時の外部パッケージはありません。

```sh
python3 scripts/build.py
node --test tests/*.test.mjs
python3 -m http.server 4926 --bind 127.0.0.1 --directory public
```

http://127.0.0.1:4926/wildlife/ を開く。

## 構成

- `data/species.json`: 編集済みの図鑑項目。種と亜種、出典、島別の確認範囲を保持。
- `data/checklist-records.json`: 原文見出しからの未照合記録。現行学名や現在の生息の断定に使わない。
- `data/sources.json`: 参照URLと範囲。
- `data/illustrations.json`: 素材・写真参照・検証状態の台帳。
- `assets/`: 生成したPNGマスター。公開で使うのは`cute-*`のみ。
- `public/wildlife/`: 配信ファイル。生成HTML・軽量WebP・CSS・JS・公開データ。
- `scripts/build.py`: ローカルデータからHTMLとサイトマップを生成。
- `scripts/prepare-data.py`: 取得済み研究PDFのテキストから候補を再抽出。通常のbuildには不要。
- `worker.mjs`: 専用パスの配信・ヘッダー・404。認証情報や外部APIなし。
- `docs/`: デザイン、検証、公開・復旧記録。

図鑑の情報を更新する場合は`data/`を編集してbuild。調査資料から再抽出する場合は先に`docs/RESEARCH.md`を読む。`prepare-data.py`は編集済み項目も再生成するため、手動編集したdataを上書きしないよう差分を確認する。

## 公開の境界

専用Worker `shima-craft-amami-wildlife` が `/wildlife` と `/wildlife/*` だけを担当。既存のホームWorker・制作サイトWorker・他プロジェクトを上書きしない。秘密情報・研究用写真・第三者PDFを配信/Git/ZIPに入れない。

デザイン変更の最終指示は2026-11-01の「全部ゆるかわ」。以前の写実的なイラストは採用しない。公開に使う全5点は写真を確認して生成。形態の専門家監修は未実施。
