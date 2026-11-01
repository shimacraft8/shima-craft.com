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

デザイン変更の最終指示は2026-11-01の「全部ゆるかわ」。以前の写実的なイラストは採用しない。初公開の5点とローカル追加34項目は写真を確認して生成。形態の専門家監修は未実施。

## 2026-11-01 追加改修（ローカル0.1.1）

先行39項目すべてに透過イラストを組み込み済み。実写は30項目。ルリカケスは細身のv2、ハブ/ヒメハブは交差しないv2、オビトカゲモドキは独立した4本の脚が見える真上構図のv3を採用。不採用画像を公開選択に戻さない回帰チェックを追加。

ユーザー提供の248名称（ザトウクジラ・マッコウクジラを含む）は `data/requested-taxa.json` / CSV に保存。38件は既存解説と対応、残り210名称は出典照合待ち。全248種の確定や全群島の全動物網羅を意味しない。別に文献抽出1179記録（候補名グループ877）あり、重複・亜種・未同定・過去の記録を含むため件数を合算しない。

本番は初版0.1.0（5点のイラスト）のまま。今回の0.1.1は未デプロイ。初版のGitHub push成功は確認済み。公開確認の追加通信が自動承認レビューの利用上限で実行されなかったため、追加の本番操作を止めた。詳細は `docs/CONTINUATION_20261101.md`。

選択画像の再生成ではなく、保存済み原画からのWebP再作成:
`WILDLIFE_SHARP_PACKAGE=/absolute/path/package.json node scripts/adopt-illustrations.mjs`
（sharpのある既存開発環境を指定。実行時のサイトには依存なし。）

ZIP: `python3 scripts/package.py`。原画・ソース・データ・公開ファイル・資料/テスト記録を収録。認証情報、.wrangler、研究用の第三者原画像/PDF、依存とGitは除外。
