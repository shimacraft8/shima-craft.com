# Web0.3.8：通常カラーの太陽・月の地図

2026-10-21。ユーザーの「店舗・地名・道路から位置を把握しやすく」という指示に対応。対象は太陽/月の方位図とその拡大表示。台風地図・外側の黒金・既存ページは保持。公開結果は末尾へ記録。

## 変更

- OpenStreetMap Standard（OSM Carto）の通常カラーを使用。色調フィルターを適用しない。初期ズーム12、範囲9–19。拡大すると道路・地名・施設/登録された店舗のラベルを確認可能。店舗データの網羅・営業時間・営業継続は保証しない。検索API・Google Places・経路検索・店舗情報の独自取込は追加していない。
- 方位線は従来の金色実線/淡色破線に暗い縁取りを追加。明るい背景でも方向が判別できるようにした。地点選択・移動・中央を計算地点にする・地域へ戻す・太陽/月・時刻/度数の計算は維持。台風地図は地理院の黒金のまま。
- © OpenStreetMap contributors と著作権ページへのリンクを地図内に常時表示。折り畳まない。地図修正リンク、プライバシー案内、出典台帳を更新。OSM配信先のみCSPのimg-srcへ追加。外部への位置検索・GPS取得は行わない。

## 配信条件・費用

[OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) と [著作権/ライセンス](https://www.openstreetmap.org/copyright) を2026-10-21に確認。標準HTTPSタイルURL、ブラウザの通常User-Agent・Referer、HTTPキャッシュに従う。Referrer-Policyはstrict-origin-when-cross-originとし、サイトのオリジンを送る。表示中のタイルだけを要求し、keepBuffer=0・ズーム中の先読みなし。オフライン保存・タイルZIP・巡回ダウンロード・全地域の自動走査は実装しない。

有料サービス/鍵/契約/新しい依存パッケージは追加なし。OSMFの配信はbest-effortでSLAなし、無制限利用の保証ではない。負荷増加・提供条件変更時には配信元の再検討が必要。取得失敗時はエラーと時刻/方位を残す。通常のブラウザ閲覧で位置を示すタイル番号・IP等とサイトのオリジンは配信元へ伝わる。選択座標自体・旅のメモは送信しない。

## 検証

- 開発140件・公開専用109件の回帰試験、Lint/型検査/ビルドを実施。新規の低影響な配色差分だけをなぞるテストは作らず、既存の地点計算・方位・地図境界・API/旧ページの回帰を使用。
- ブラウザで実タイルのカラー/ラベル/道路、ズーム・地点変更・太陽/月、暗い縁取りの線と常時出典を確認。市街地の施設・町名・道路番号を目視。コンソールエラーなし。画面幅と出典位置の確認結果は証跡へ保存。
- ui-ux-pro-maxのContrast Readabilityを参照。web-design-guidelines最新版で地図の色調/線のコントラスト、48pxズームボタン、フォーカス、出典、エラー、既存のキーボード/減らす動きの維持をレビュー。

iOS Safari/Android Chrome実機、VoiceOver/TalkBack、実機OS文字拡大・通信遮断は未確認。アプリ内プレビューを実機確認と扱わない。

## 公開結果

公開済み。管理者解析・GA計測追加・Nativeは公開対象外。GitHubとCloudflareの対象を再照合して、専用cloneのhomepage-only Workerから公開する。直前の復旧先は bb8ad527-408a-424c-9c6e-1701bf053add。


- 公開：2026-10-21 14:02 JST、https://shima-craft.com/ 。実装ae911f6、GitHub専用ブランチへpush済み。
- Worker Version：a8ea2fd1-5f90-4150-b4b1-3cfe3f0885d6。復旧先bb8ad527-408a-424c-9c6e-1701bf053add。
- GitHub shimacraft8、Cloudflare shimacraft8@gmail.com、account 42f69e35f08bb21dca5194467e2f59de、対象ドメイン両ルート、SHIMA_ORIGINを再照合。元サービスdeployment一覧は前後で同一。
- 開発140/公開109試験、Lint/型検査/ビルド成功。本番29 HTTP項目成功。
- ローカル320/1440pxで横はみ出しなし、出典が地図内で常時可視。台風は地理院フィルター、方位図はfilter:noneを確認。
- 本番でもOSM実タイル・町名/施設・道路番号・暗い縁取りの方位線、地点変更後の再計算、可視出典とコンソールエラーなしを確認。公開証跡はresearch/street-map/。
- 最新ZIPはnpm run packageで再生成。CRCと全ファイルSHA256を検証。認証設定/Git/依存は収録外。開発用未公開解析ソースを含むためZIP全体を直接deployしない。
