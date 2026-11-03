# Claude Opus 5 / High / 独立レビュー 1

対象はローカルの固定スナップショット。指摘はCodexが再検証し採否を判断。手動実機テストを実施したという意味ではありません。

レビュー対象を全部読みました（`round1.json` と `round1.stderr.log` は 0 バイトで中身なし、スクショは `mobile-round1.png` の 1 枚のみ。以下は**ソース読解＋その 1 枚**だけに基づきます）。

---

# A. 重大：移動・当たり判定・入力

### A1. ドラッグ見回しの水平軸だけ反転している（最優先）
`renderer.js:26` `this.turn(-(e.clientX-d.x)*.004, -(e.clientY-d.y)*.003)`

- yaw 規約は `model.js:7-9`（yaw 増＝右旋回）、カメラは `rotation.y=-yaw`（`renderer.js:84`）で整合済み。
- よって**右へドラッグ＝左を向く**（パノラマ掴み式）。一方**下へドラッグ＝下を向く**（FPS 式）。2 軸で規約が逆で、「ゲーム的一人称」としては致命的に気持ち悪い。矢印キー（`renderer.js:34` ArrowLeft＝左旋回）とも噛み合っていない。
- 패치: `this.turn((e.clientX-d.x)*.004,-(e.clientY-d.y)*.003);` に変更し、`museum.css:22` の `cursor:grab` / `:active{grabbing}` は掴み操作の誤誘導なので `cursor:crosshair`（or default）へ。

### A2. マルチタッチで見回しが死ぬ
`renderer.js:22-29`

- 2 本目の指が canvas に触れると `this.drag` が無条件に上書きされ、さらに `pointerup` が `const d=this.drag;this.drag=null;` を **id 照合より先に実行**。つまり**1 本目を離した瞬間に 2 本目のドラッグ状態が消える**（以後その指を動かしても無反応）。`pointercancel`（:29）も id 無視で全消し。
- 패치:
```js
pointerdown: if(e.button!==0||this.drag)return; …
pointerup/pointercancel: if(!this.drag||this.drag.id!==e.pointerId)return; const d=this.drag; this.drag=null; …
```

### A3. 空タップで勝手にズームが変わる
`renderer.js:110` 末尾 `else this.zoom(this.zoomLevel?-this.zoomLevel:1)`

- 動物を外したタップ（＝大半のタップ）が FOV を 68→43° に飛ばす。タッチでは `d.moved<7`px の閾値が低く、見回しの微小ドラッグも「タップ」判定になりやすい。
- 패치: 空ヒット時は何もしない（ズームは既存の ±ボタンに任せる）。閾値は touch で 10〜12px へ（`e.pointerType==='touch'?12:7`）。

### A4. 大木の不可視コリジョンが実体の 2 倍以上
`forest.js:86` `this.support(x,z,1,1,y,y+1)` が **side ループ内にあるため 1 本につき 2 回**登録され、しかも hx=hz=1（＋RADIUS で実効 2.48m 角）。描画されている板根は `1.1×0.22` の十字スラブだけなので、**対角線方向は完全に空気なのに壁**。
- 패치: ループ外に出して `this.support(x,z,.62,.62,y,y+1)`（内接）、または十字に合わせて薄い support を 2 本。

### A5. 足元が 0.35m 刻みで瞬間移動する
`renderer.js:79` `this.camera.position.y=next.height+EYE`（`RISE=.35`）。段差のたびに視点が 35cm テレポートして、歩行中ずっとガタつく。
- 패치: 目標高さを保持してフレーム補間（判定は従来どおり量子化値のまま）:
```js
this.eyeTarget=next.height+EYE;
this.camera.position.y+=(this.eyeTarget-this.camera.position.y)*Math.min(1,delta*14);
```

### A6. `stepMovement` だけ現在地更新が走らない
`renderer.js:66`：キーボード/支援技術からの単発移動（`index.js:116`）では `onPlace`/`this.spot` が更新されず、`#forest-place` も `dataset` も古いまま。`frame()`:79 と同じ最近傍更新を関数に切り出して両方から呼ぶ。

### A7. Escape が強すぎる
`index.js:127`：`#forest-search` の `<select>` を開いて Esc で閉じた瞬間、森ごと退出する。
- 패치: `if(e.target.closest('.forest-search'))return;` ＋ open な details があれば先にそれを閉じる。

---

# B. モバイル／キーボード／reduced motion

- **B1. 見回しボタンに長押しがない**：`index.js:107-109` は click のみ（30°/0.2rad ステップ）。歩行パッドは長押し対応済み（:111-118）なのに視点だけ連打必須で、「自由に見回せる」要件を満たしていない。歩行と同じ pointer-capture パターンで連続旋回（例 `setTurn(dx,dy)` を `movement()` と同様に毎フレーム加算）に。**モバイル体験で一番効く入力修正。**
- **B2. 初回アクセスで無条件に 3D を自動起動**：`index.js:142`（`mode=2d` か `#catalog` 以外は `await load3d()`）。three.js のダウンロード＋ボクセル地形生成（下記 D1）が、回線もジャイロも関係なく全訪問者に走る。`forest-enter`（森に入る）があるのだから、少なくとも `reduce.matches` または `navigator.connection?.saveData` の時は自動起動せずボタン待ちにすべき。**reduced-motion 利用者をいきなり一人称 3D に放り込むのは a11y 的に問題**。
- **B3. canvas の role が誤り**：`renderer.js:14` `role="img"` ＋ `tabIndex=0` ＋ `aria-keyshortcuts`。`img` ロールに操作セマンティクスは乗らず、SR は「画像」としか読まない。`role="application"`（＋`aria-roledescription="ブロックの森"`）に。
- **B4. 現在地が SR に通知されない**：`#forest-place-name` は `.museum-sr` だが live region ではない（`museum.py:19`）。一方 `#museum-status`（role=status）は WebGL エラー専用。`onPlace` で `#museum-status` に「ヒカゲヘゴの林」＋既に実装済みで**未使用の** `nearestLandmark()`（`model.js:239`）で「前方に滝」を流せば、視覚なしでも森を歩ける。実装コストほぼゼロ。
- **B5. `#motion-toggle` のハンドラがこのスナップショット内に存在しない**（`museum.py:24` にボタンと `aria-pressed="false"` だけ）。`.motion-paused` を付与する処理がサイト共通 JS 側にあるか要確認。無ければ reduced-motion の手動オフ手段が死んでいる。
- **B6. `touch-action:pinch-zoom`**（`museum.css:22`）：全画面 3D 中にブラウザのピンチズームが走ると UI ごと拡大される。ズームは専用ボタンがあるので canvas は `touch-action:none` が妥当（ページ自体の拡大は 2D カタログ側で担保）。
- **B7. ヒント文**：`museum.py:23` は 760px 以下で非表示（`museum.css:94`）かつ Shift ダッシュ・Home・「動物をタップで解説」に言及なし。モバイルは初回だけ短いオーバーレイで出す価値あり。

---

# C. 形状・見た目の不具合（コード由来＋スクショで確認できたもの）

### C1. 地面のチェッカー模様（スクショで明確に出ている）
`voxel-model.js:55` `const noise=(Math.sin(cx*12.98+cz*78.23)*43758.5453)%1;`
- JS の `%` は符号を残すので範囲は **(-1,1)**（GLSL `fract` のつもりが倍振幅）。さらに `cx,cz` は 0.625 の等差数列なので sin が**周期的に整列し、ノイズではなく規則パターン**になる。手前の平地に出ている明暗の市松はこれ。振幅も sRGB で ±0.035（赤 .34 に対し ±10%）と過大。
- 패치:
```js
const h=(ix,iy)=>{let n=Math.imul(ix,374761393)^Math.imul(iy,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
const noise=h(Math.round(cx/CELL),Math.round(cz/CELL))-.5; // [-.5,.5)
… clamp(v+noise*.036,0,1)
```

### C2. 側面の陰影が赤に寄っている（＝色相バグ）
`voxel-model.js:63` `c.map((v,i)=>v*(i===0?.70:.55))` — R だけ 0.70、G/B は 0.55。単なる減光のつもりが**崖面だけ赤茶けた別の色**になる。
- 패치: 色相中立＋Minecraft 式の面別ライティングに:
```js
const shade=n[0]?.72:.58; face(..., c.map(v=>v*shade));
```

### C3. 木道が空中に浮く
`voxel-model.js:22` `const bridge=isPath&&height>raw+.45&&raw<water+.5;`
- 橋脚（`forest.js:25`）は **水の上でしか**立たない。乾いた窪地を横切る区間では `ground=raw`（:23）なので、**支柱なしの板が宙に浮いたまま**になる。
- 패치: `const bridge=isPath&&height>raw+.45;`（水条件を外す）。橋脚の間引きは `%4===0` のままでよい。

### C4. 川・海の輪郭だけ滑らかで、ブロック世界と矛盾
`forest.js:31-36`：水キューブの幅 `riverEdge(mid)*2` と中心 `riverCentre(mid)` が連続値なので、**ブロックの地面を斜めに切る水際**になる。海も 2200m の平面で直線的な汀線。LEGO/Minecraft の見た目要件とここが一番食い違う。
- 패치: `const c=cellCentre(riverCentre(mid)), w=Math.max(CELL,Math.round(riverEdge(mid)*2/CELL)*CELL);` で x 方向をセルにスナップ。海も汀線付近だけ 1 セル幅のキューブ列を被せると段々の渚になる。

### C5. 水マテリアルが川と海で共有＋`depthWrite:false`
`forest.js:27,32,36`：滝の壁キューブと水面キューブが重なる箇所で二重ブレンドし、河口では海面と川面が重なって暗くなる。`update()`(:125) の opacity 揺れも全水面に同時に効く。
- 패치: 海は専用マテリアル（`depthWrite:true, opacity:1` もしくは 0.95）に分離。川だけ半透明＋`depthWrite:false`。

### C6. 空と霧の色が合っていない（スクショの白っぽい空）
`paper-world.js:18` fog/background `#b9d3d0`、`paper-world.js:26` の空シェーダ地平色 `vec3(.66,.80,.79)` は**リニア値**で、ACES＋sRGB 変換後はおよそ `#d6e8e8`。遠景は暗いティールに霞むのに、その背後の空だけ白く抜ける帯ができる。
- 패치: fog/background を空の地平色（トーンマップ後の値）に合わせるか、シェーダ側の horizon を `vec3(.49,.63,.62)` 付近に落とす。

### C7. 雲と遠景の尾根が霧で完全に消えている
`FogExp2(.008)` は 260m で 98.7% 減衰。`makeClouds()`（`forest.js:111`、r=260,y=110）は実質不可視、`horizonRidge`（r=90→230、`model.js:70`）も `TERRAIN_BOUNDS`（±100/-110..155）で半分しか生成されず、残りも霧で消える。**空が空虚に見える主因。**
- 패치: 雲を r≈120〜160 / y≈70〜90 に下ろし、サイズを 1.5 倍。霧は `.006` 程度に。

### C8. ヒカゲヘゴが全個体同一
`forest.js:95-108`：葉柄は常に 8 本・常に `a=n*π/4`・半径固定 3.2m、上下変化は `sin(tπ)*.55 - t²*.6` でほぼ水平。結果「同じ扇風機」が 24 個並ぶ。幹高だけが乱数。ユーザーが明示指定した植物なので造形の作り込み価値が高い（→ E3）。

### C9. 動物ごとの専用支柱が均質
`forest.js:71-76`：branch/canopy/trunk の 17 種すべてに `0.32m` 角・同色の柱＋`2.3×0.7×2` の葉スラブが生える。近くに本物の木があってもそれを使わないので、**電柱が等間隔に並ぶ**見え方になる。幅・色・高さを `p.id` 由来の決定的乱数で振る、もしくは半径 3m 以内の `tree()` の枝に乗せる分岐を入れる。

### C10. カットアウトの「紙の縁」が実質見えない
`paper-world.js:66,73`：`pad=1`px、シルエットのオフセットは `pad*.45≈0.45`px。512px のテクスチャに対して縁取りが 0〜1px では存在しないのと同じ。2.5D である（立体ではない）ことを視覚的に成立させている要素なので、ここは効く（→ E 次点）。

### C11. その他確認できる点
- ラベルの遮蔽判定は**地形のみ**（`renderer.js:100`）。幹の裏の動物にもラベルが出る。`pick()` は `forest.occluders` を見ているので判定が不一致。上位 6 件だけ同じレイで木も判定すれば十分安い。
- スクショ右下、**ズーム「−」ボタンが「近くへ移動」セレクト行と重なって半分隠れている**（`museum.css:137` `.forest-zoom{bottom:192px}` vs `.forest-location` の行高）。`.forest-zoom` を `.forest-bottom` のグリッド内（`grid-column:2;grid-row:1`）に入れるか bottom を 230px に。
- `focusSpecies`（`renderer.js:58`）は `item.size*.4` で俯仰を決めるが、実際の描画高は `item.height`（アスペクト依存、`paper-world.js:97`）。横長の生き物では頭上を向く。`(item.height??item.size)*.5` に。

---

# D. パフォーマンス

### D1. 地形生成が最大のボトルネック（主スレッド同期）
`voxel-model.js:48-67` + `forest.js:17`
- `TERRAIN_BOUNDS` は 200×265m / `CELL=1.25` → **33,920 セル**。1 セルにつき `surfaceAt` を自分＋隣接 4 回＝**約 17 万回**。`surfaceAt`→`pathAt` は 6 区間それぞれで `terrainHeight` を**両端 2 回ずつ呼ぶ**（`voxel-model.js:14`）ので、合計 **200 万回超の `terrainHeight`**（各 10 回以上の smoothstep/sin）。モバイルで数百 ms〜秒単位のフリーズ。
- `forest.js:22` の木道ループでさらに 15,200 セル分の `surfaceAt`。
- **패치（効果順）**:
  1. `PATHS` の端点高さを事前計算（1 行で ~90% 削減）:
     ```js
     export const PATHS=[...].map(([a,b])=>{const A=at(a),B=at(b);return{a:A,b:B,ha:terrainHeight(A.x,A.z),hb:terrainHeight(B.x,B.z)};});
     // pathAt: height:quantize(ha*(1-t)+hb*t)
     ```
  2. `surfaceAt` をセル座標キーの `Map` でメモ化（隣接参照の 5 重計算と `walk()` の毎フレーム呼び出しが消える）。
  3. 頂点は非インデックスで pos/normal/color×3 float＝**約 16MB の VBO**＋生成中の通常配列で 30MB 超の一時割り当て。せめて color を `Uint8Array(normalized)`、normal を `Int8Array(normalized)` に。

### D2. 地形が 1 メッシュなので視錐台カリングが一切効かない
`forest.js:20`。カメラ背後の 7 割を毎フレーム submit している。**40×40m 程度のチャンクに分割（35 メッシュ）**するだけでドローコールは 35 と許容範囲、三角形は 1/3 以下になる。インスタンス群（`flush()`:115）も同様に、せめて `fern`/`leaves` は領域別に 2〜3 分割する価値がある。

### D3. 何も動いていなくても 30fps で回り続ける
`renderer.js:72`（`!this.paused` だけで RAF 継続）＋ `:76`（30fps に間引くが毎回レンダリングはする）。その理由が `forest.js:125` の **opacity ±0.025（＝肉眼で見えない）水面アニメ 1 本**だけ。モバイルの電池と発熱、そして `:89` の `slow` カウンタ誤作動（不要な DPR 低下）に直結。
- 패치: アイドル時だけ 12〜14fps に:
```js
const budget=(this.dirty||this.walking)?1000/60:1000/14;
if(!this.paused&&this.last&&now-this.last<budget&&!this.dirty){this.refresh();return;}
```

### D4. `lowerQuality()` が空実装
`forest.js:126`。劣化パスが DPR を下げるだけで、重さの主因（地形三角形）に効かない。`fern`/`leaves` の `InstancedMesh.count` を 60% に落とす、霧を濃くして遠景チャンクを隠す等、1〜2 行でも実効のある処理を。

### D5. 死にコード
- **`src/museum/vegetation.js` は完全に未参照**（どこからも import されていない。`this.disposables` / `this.budget` / `this.groundPoint` も未定義で、そもそも動かない）。さらに `three/addons/utils/BufferGeometryUtils.js` を import しており、バンドル設定次第でビルドに巻き込まれる。**削除推奨。**
- `model.js` の `buildTerrain` / `buildRiver` / `buildSea` / `groundColour` / `PALETTE` / `gridIndices` は、ボクセル化以降どこからも使われていない（`tests/forest360.test.mjs:14` だけが参照）。テストが**実際には描画されないメッシュ**の法線を検証している状態で、回帰検知の意味が失われている。テストを `buildVoxelTerrain` に差し替え、旧関数は削除を。
- `VIEWPOINTS[].eye` も未使用（`renderer.js:53` は定数 `EYE`）。
- `renderer.js:82` の `rotation.set(this.pitch,this.yaw,0,'YXZ')` は直後に `:84` で y を上書きしており誤読を誘う。`this.camera.rotation.set(this.pitch,-this.yaw,0);` 1 行に。

### D6. 細かいもの
- 動物テクスチャ 40 枚 × 512²（モバイル 384²）CanvasTexture ＝ GPU 23〜40MB。モバイルは 256 で十分。
- `renderer.js:88`：移動中は `dirty` が常に true なので 500ms スロットルが効かず、**毎フレーム 18 個の dataset 属性を書いている**。計測用途なら常に 250ms スロットルで良い。
- `renderer.js:72`：`this.movement()` を 2 回呼んでいる。

---

# E. 視覚改善トップ3（実装順の推奨）

### E1. 面ごとのコントラストを取り戻す（最優先・効果最大）
いまの画面が「LEGO に見えない」最大の理由は、面の明暗差がほぼ無いこと。
1. `voxel-model.js:63` の赤寄り減光を色相中立の面別シェードへ（C2）。
2. `paper-world.js:19-20` のライト配分を見直す：`hemi 1.7 → 0.8`、`sun 2.1 → 1.6`、`fill .7 → .35`。現状は hemi が支配的で、Lambert の法線差が潰れて全部ミルク色になっている（スクショの白茶けた幹・平板な地面）。
3. 地面セルに簡易 AO：隣接 4 セルのうち自分より高いものの数で頂点色を 0.82〜1.0 倍（`buildVoxelTerrain` 内で `neighbour` は既に取得済み、追加コストほぼゼロ）。
4. C1 のチェッカー除去を同時に。

### E2. 水（川・滝・海）をブロック化して段差を見せる
ユーザー要件の中核なのに、いま唯一「滑らかな曲線」で残っている要素。
1. 水面の幅と中心を `CELL` にスナップ（C4）。
2. 滝は `forest.js:34` の壁キューブ 1 枚ではなく、`RISE` 刻みで **1 段 = 1 ブロックの階段**として積み、各段の前面に `foam` ブロックを置く（既存の `foam` バッチを流用）。段差があることで「落ちている」ことが形で読める。
3. 海は専用マテリアルに分離（C5）し、汀線に 1 セル幅の泡ブロック列を追加。
4. 橋脚の修正（C3）も水まわりなので同時に。

### E3. ヒカゲヘゴと近景の密度
1. ヒカゲヘゴ（`forest.js:95`）：葉柄数 6〜9 のランダム、基準角 `random()*π/4` のオフセット、葉柄ごとに長さ ±25%、上下プロファイルを強めて（t=0.3 で +0.9m、t=1 で −1.4m）**弓なりに反って垂れる**形に。幹上部に巻いた新芽（小ブロック 2〜3 個）を足すと種として識別できる。
2. 近景が空きすぎ（スクショ手前の平地が完全な無地）。`makeWoodland`:60 の下草は視点から 2m 以内を除外しているうえ 600 個が 86×102m に散るので**実効密度が低すぎる**。視点半径 12m 内に限定した追加クラスター（各視点 60 個、`clear(x,z,1.2)`）を入れると、一人称の足元が一気に森になる。コストは instanced cube 数百個で無視できる。

**次点（安価で効果大）**：C10 のカットアウト縁取り。`pad=Math.max(3,Math.round(Math.max(w,h)*.012))` にして、シルエットを 8 方向に `pad` ずつオフセット描画してから本体を重ねる。40 点のイラストがブロック背景から分離して、「立体モデルではない 2.5D」という説明とも一致する。

---

# F. 確認したい点（round 2 向け）
- `#motion-toggle` のハンドラがこのフォルダ外にあるか（B5）。
- `round1.json` / `round1.stderr.log` が空のため、実測 FPS・ドローコール・`dataset` 値は未検証。D1/D2 の見積りは**セル数からの計算**です。次回は `host.dataset`（drawCalls / triangles / dpr）のダンプと、PC 横向き・ローエンド Android のスクショを頂ければ、劣化パスと D3 の挙動まで詰められます。
- 既存の 40 件のイラスト／写真／カタログ／詳細 URL に触れる指摘は上記に含まれていません（`index.js:57` の詳細リンク、`planAnimals` の 40 件配置は維持前提）。
