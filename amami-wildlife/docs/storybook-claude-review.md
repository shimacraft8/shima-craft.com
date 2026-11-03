# Claude レビュー / 0.6.0

モデル: claude-opus-5。effort: high。Readのみ、編集不可・認証情報へのアクセス不可。

コードを読んだ結果、**致命的／公開を止めるレベルのバグはありません**。履歴（push/replace + popstate + `fromHistory`）、ダイアログのフォールバック（`a[href]` を常に保持、`data` 未取得時は素通し）、`touch-action:pan-y pinch-zoom` + `pointercancel` によるスワイプ／縦スクロールの切り分け、グリッドの `min-width:0`／`minmax(0,1fr)` は正しく処理されています。以下は実際に挙動差が出る指摘のみです。

---

### 1. ページ送りボタンが無効化され、ダイアログ内でフォーカスが失われる ― 重要度：中
`src/storybook/index.js:24`（`$('book-prev').disabled=page===0;$('book-next').disabled=page===2;`）／`:49`

キーボードで「次のページ」を押して 3 ページ目に到達すると、**今フォーカスしているボタン自身が `disabled`** になります。フォーカスは `body` に落ち、モーダル内なので次の Tab は先頭（閉じるボタン）へ戻ります。「前のページ」で 1 ページ目に戻る場合も同じです。

**修正案**: `showPage()` は `pageIndex()` で 0–2 にクランプ済みなので、`disabled` をやめて `aria-disabled="true"` + CSS の見た目のみ無効化にする（押しても no-op）。`disabled` を維持するなら、無効化の直前に `document.activeElement===btn` を判定して `tabs[page]` か反対側のボタンへ `focus()` を移す。

### 2. reduced-motion でも章が 1.55 画面分ピン留めされたまま ― 重要度：低〜中
`public/wildlife/assets/storybook.css:10`（`.story-chapter{min-height:155svh}` / `.chapter-pin{position:sticky}`）、`:21`（reduce ブロック）

reduce 指定時は `transform:none!important` で視差は止まりますが、**「スクロールしても絵が動かない区間」が各章 1.55 画面分残る**構成自体は変わりません。前庭障害系のユーザーには、この擬似スクロールジャック自体が負担になります。低身長ビューポート用（`:24`）と同じ対処を reduce にも入れるのが安全です。

**修正案**: `@media(prefers-reduced-motion:reduce)` に `.story-chapter{min-height:0;padding-block:36px}` / `.chapter-pin{position:relative;top:auto;height:auto;max-height:none}` を追加（既存ブロックのコピーで済みます）。

### 3. reduced-motion 時にシーン進捗バーが常に 55% を示す ― 重要度：低
`src/storybook/index.js:12`（`const progress=isPaused()?.55:scrollProgress(...)`）＋ `storybook.css:11`（`.scene-progress>span{transform:scaleX(var(--chapter-progress))}`）

`isPaused()` が真のとき `--chapter-progress` を 0.55 固定にしていますが、CSS 側は `.chapter-background/.chapter-creature` にしか `transform:none!important` を当てていないため、**進捗バーだけが「55% 読了」と嘘の状態で固定**されます。

**修正案**: `--chapter-progress` は常に実測値を入れ（変形の抑止は既存の CSS `!important` に任せる）、バーの正確性を保つ。あるいは paused 時は `.scene-progress{display:none}`。

### 4. OS が reduce のとき「動きを再開する」トグルが機能しない ― 重要度：低
`public/wildlife/assets/app.js:10,13-14` と `src/storybook/index.js:8`

`paused` は `reduce.matches` で初期化されますが、`isPaused()` が `reduce.matches` を OR で見ており、さらに CSS の reduce ブロックが `!important` で transform を殺すため、**ユーザーがトグルを押して「動きを止める」表示に戻っても何も再開しません**（ラベルと実態が不一致）。

**修正案**: `reduce.matches` が真のときはトグルを `disabled` にして説明文を出すか、明示的 opt-in 用クラス（例 `motion-allowed`）を導入して JS／CSS 双方の判定に反映する。

### 5. 同一メディアクエリの重複で前半ブロックが死んでいる ― 重要度：低（保守性）
`public/wildlife/assets/storybook.css:20` と `:24` がどちらも `@media(max-height:650px) and (min-width:761px)`

後勝ちで `:20` の `.story-chapter{min-height:160svh}` と `.chapter-pin{min-height:420px}` は**完全に無効**です（最終的には `:24` のフロー配置が適用され、意図どおりの結果ではあります）。`:20` を編集した人が必ず混乱します。

**修正案**: `:20` から `.story-chapter` と `.chapter-pin` の宣言を削除し、タイポグラフィ調整だけを残して `:24` に統合。

### 6. `history.replaceState(null, ...)` が絵本側の state を消す ― 重要度：低
`public/wildlife/assets/app.js:20,44,64`

図鑑フィルタは同じページ（`.story-home .catalog`）に同居しており、`replaceState(null, ...)` で **`{amamiBook:true}` を含む state オブジェクトを破棄**します。検索入力の 160ms デバウンスが本を開いた直後に発火すると state が消え、その後「戻る→進む」で復帰したときに `entryInHistory` が false と判定され、閉じる操作で `history.back()` が走らなくなります（URL からパラメータは消えるので実害は履歴エントリの残骸のみ）。`index.js` は一貫して `history.state` を引き継いでいるので、合わせるべきです。

**修正案**: 3 箇所とも `history.replaceState(history.state, '', u)` に変更。

### 7. JS なしでは `#motion-toggle` が無反応のまま表示される ― 重要度：低
`scripts/storybook.py:19`

JS 無しでは `.is-in-view` が付かずアニメーション自体が走らない（`animation-play-state:paused` のまま）ため実害はありませんが、**押しても何も起きないボタンだけが残ります**。

**修正案**: Python 側で `hidden` 付きで出力し、`app.js` の `updateMotion()` で `motion.hidden=false` にする（他の no-JS フォールバックの方針と一致します）。

---

### 補足（バグではない確認済み事項）
- `scripts/storybook.py:30` の `str.replace(' src=""','')` は Python では全件置換なので、`book-art`／`book-photo` 両方から空 `src` が除去されています（意図どおり）。
- `scene['label'] / english / number / id` は `E()` を通っていません（`title`/`intro`/`backgroundAlt`/種名は通っています）。自前のデータファイル由来なので実害はありませんが、一貫性のため `E()` を通すのが無難です。
- `data/story-scenes.json` の `accent` はどのファイルからも参照されていません（未使用フィールド）。

## 対応

1. 端のページへ移動したとき、無効化する前に選択中タブへフォーカスを移す。
2. OS reduced-motionでは章を通常フローへ変更。
3. 進捗は停止中も実スクロール値を保持。
4. OS reduced-motion中のボタンは説明ラベル付きで無効化。
5. 短い画面の重複宣言を整理。
6. 共有app.jsのreplaceStateでhistory.stateを維持。
7. 動作停止ボタンはJS実行後に表示。

背景PNG生成や種データはレビュー用のモデルへ送っていません。レビューは指定ソースと確認用スクリーンショットに限定しました。
