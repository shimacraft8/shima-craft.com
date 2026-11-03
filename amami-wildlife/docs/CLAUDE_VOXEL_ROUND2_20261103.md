# Claude Opus 5 / High / 独立レビュー 2

対象はローカルの固定スナップショット。指摘はCodexが再検証し採否を判断。手動実機テストを実施したという意味ではありません。

# ROUND 2 最終レビュー（独立）

## リリース阻害バグ（実コードに根拠あり）

**1. `surfaceAt` のキャッシュキーが負座標で衝突 → 地形・歩行が破綻**
`voxel-model.js:20` のキーは `Math.floor(x/CELL),Math.floor(z/CELL)` だが、`cellCentre`（:10）も同じ `Math.floor` なので整合は取れている。問題はキャッシュ上限（:26）の挙動：`surfaces.size<50000` に達すると**以後すべて新規計算のまま保存されず**、`buildVoxelTerrain`（:56、TERRAIN_BOUNDS 200×265m ÷1.25² ≒ 33,920 セル）＋歩行・ラベル遮蔽レイ（renderer.js:106 の16サンプル×毎フレーム）で上限に到達し得る。到達後はフレームごとに `terrainHeight`＋`pathAt`（全6区間ループ）を数百回再計算し、歩行時のフレーム落ち＝`this.slow` 増加→`lowerQuality()` 誤発火につながる。「bounded cell cache」と称するが**追い出し戦略がなく、劣化が静かに起きる**点が実害。上限を上げるか LRU 化を推奨。

**2. `index.js:147` — `reduce.matches` / `saveData` 時に `legacy` ディープリンクの焦点が無反応**
`exitForest(false)` 経路では `renderer` が null のため、次行 `renderer?.focusSpecies(...)`（:148）は黙って何もしない。`legacy.open` が false の場合、**URL で種を指定して来た利用者には何の変化も起きない**（セレクト値だけ変わる）。2Dフォールバック時は該当種の図鑑項目へスクロール、もしくは `openExhibit` を常に呼ぶ必要がある。

**3. `index.js:109,118` — `end()` が pointerId を照合しない**
`pointer` 変数は保持するが `end` は `e.pointerId` と比較せず、マルチタッチで別指の `pointerup` が先に届くと押下中のボタンが解除される。round1 の「pointer id guards」は canvas 側（renderer.js:24,28）にのみ適用済みで、**UIボタン側は未修正**。二本指操作を明示サポートする（:115 のコメント）以上、`if(pointer!==e?.pointerId)return;` 相当のガードが要る。

**4. `renderer.js:77` — `movement()` を1フレームに3回構築**
機能バグではないが、`refresh()` は `invalidate()` から毎イベント呼ばれる。実害は小さいので阻害ではない（記録のみ）。

**5. `renderer.js:94` — `VIEWPOINTS[this.spot].id`**
`spot` は常に有効添字だが、`goToSpot` が不正 id で早期 return（:54）する一方 `index.js:99` は `requestedSpot` を文字列で渡す。URL の `spot` は :145 で検証済みのため実害なし。

→ **阻害は 1・2・3 の三点。**

## 視覚的改善（2件）

**A. モバイルでラベルが操作UIに潜る**（mobile-round2.png）
「リュウキュウアカショウビン」が `+` ボタンと重なりかけている。`labels()`:110 の退避は `zoomRect` のみ対象で、ズームが**位置選択行の上**に移った結果、横方向の逃げ幅（`z.left-110`、:110）が幅390pxでは `clamp` 下限106と衝突し退避不能。モバイルは下限を緩めるか縦方向退避を。

**B. 手前の幹が中央を塞ぐ**（desktop-round2.png）
初期視点で太い幹が画面中央を縦断し、せっかくの渓谷・海の眺望を分断している。`hego` の `yaw` を数度振るか観察点を 1m 側方へ寄せるだけで印象が大きく改善する。

## 結論

**上記1〜3を修正すれば、ブラウザ実機検証を条件にリリース可。** 2 は2Dフォールバック利用者に直接影響するため優先度最高。実機スマートフォン未検証である事実は残るため、`lowerQuality()` 発火閾値の挙動は実機で一度確認されたい。
