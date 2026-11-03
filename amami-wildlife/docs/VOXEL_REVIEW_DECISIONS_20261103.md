# レビュー反映記録

Claudeは claude-opus-5 / effort high、認証情報を除いたパケットで読み取り専用。UI2回、生息場所1回、40種モデル1回の計4回。外部サービスの新規契約やAPIキー発行は行っていません。

## モデルレビュー

蛇の目の高さを体の半径から導出。クロウサギの耳を短くし、後足を前足より長く。蝶の淡青色模様を広げ、アカヒゲは参照写真が雌であることを再確認して、灰色の顔を残し橙褐色の頭頂を追加。全頭を橙色にする提案はそのまま適用していません。翼/ひれの部位ボックスも登録。モデル失敗は黙って欠落させず図鑑へ戻す。通常時40/40モデル準備完了を実ブラウザーで確認。

## 生息場所レビュー

リュウキュウアオヘビは林床、オビトカゲモドキは徳之島の林床、コウモリは洞窟開口部の飛翔姿勢、ケナガネズミは枝、シロハラは林床、カミキリは立ち枯れ幹面へ。トクノシマトゲネズミを別地点へ分離し、徳之島/請島限定種は名前の下に島名を表示。裸の砂地に広葉樹/下草を生やさない。ウミガメは海面下、ラグーンの海底より上に配置し、漂う範囲の9点を自動検証。

Claudeの海底指摘は旧terrainHeightだけを概算し、実際に描画するvoxel-model.jsの海底低下を読んでいません。実際のsurfaceAtと画面で確認し、地中に埋まるという指摘は現状では再現しません。幹から離れていた平面イラストは廃止し、モデルの脚の平面を幹面に接するよう回転しています。

## 一次資料

- 環境省 奄美野生生物保護センター: https://kyushu.env.go.jp/okinawa/awcc/animal.html
- 同 昆虫: https://kyushu.env.go.jp/okinawa/awcc/insect.html
- 国土交通省 ヘビ: https://www.mlit.go.jp/tagengo-db/common/001653674.pdf
- 環境省 ウミガメ: https://www.env.go.jp/nature/kisho/kisei/species/trade/system-turtle/index.html
- 鹿児島県立博物館 オットンガエル（前肢5指）: https://www.pref.kagoshima.jp/bc05/hakubutsukan/tennen/ken/26otton-gaeru.html
- 環境省 アマミイボイモリ（体色、背側の突起）: https://ikilog.biodic.go.jp/rl_rdb/a/752.html

全40種の実写真はdata/photos.jsonのライセンス/出典に対応。動物学の専門家による全点監修は未実施です。暗色・色の個体差や性差を簡略化しています。

## Web Interface Guidelines

2026-11-03に最新原文を取得して変更箇所を確認。museum.cssの明るい海辺での白文字を上/下端のスクリーンで改善。renderer.jsのrender内のDOM測定はresizeへ、metricsは250msまたはモデル数変更時のみ更新。44px操作、focus-visible、ダイアログのフォーカス復帰、ドラッグのボタン/キー代替、pinch-zoom、停止設定を保持。galleryは非公開の検証用、実際の画像ではなくネイティブ3Dを表示。
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
