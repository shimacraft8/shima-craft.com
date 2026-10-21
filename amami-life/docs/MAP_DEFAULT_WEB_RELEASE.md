# Web0.3.9：地図の初期縮尺

2026-10-21。ユーザー添付のように奄美大島を広く見渡す初期表示へ。

- 太陽/月の初期ズームと「地域の地点へ戻す」を12→10へ変更。中心の地域座標・計算値は変更しない。
- 通常カラーOSM、ズーム9–19、クリック地点選択、太陽/月、拡大ダイアログ、操作中の視点保持は継続。台風・旧ページ・解析・Nativeの変更なし。
- 公開専用109試験、ビルド/Lint/型検査成功。ローカルで初期タイルZ10、拡大後の地域復帰Z10を実確認。
- ui-ux-pro-maxの既存の地図可読性方針を継続。web-design-guidelines最新版を取得して差分レビュー。可視フォーカス・出典・キーボード代替は維持。
- 実機iOS/Androidは未確認。OSMの条件/配信の限界、プライバシー、天文参考計算の限界はSTREET_MAP_WEB_RELEASE.mdを継続。

公開先はGitHub shimacraft8/shima-craft.comの専用ブランチとCloudflare shimacraft8@gmail.com/account 42f69e35f08bb21dca5194467e2f59de、Worker shima-craft-amami-life、routeとSHIMA_ORIGINを再照合済み。公開結果は追記。復旧先：a8ea2fd1-5f90-4150-b4b1-3cfe3f0885d6。


公開済み：2026-10-21 14:27 JST、https://shima-craft.com/ 。実装commit0b31d57。Worker Version：c3a3658c-5d6a-47c6-bc62-137a21ad6039。公開HTTP29項目成功。元サービスは前後同一。本番の初回と地域復帰がZ10で、添付の島を見渡す表示になることを430px幅で確認。横はみ出し・コンソールエラーなし。証跡はresearch/map-default/。最新ZIPを再生成し、CRCと全ファイルSHA256検証。実機未確認は継続。
