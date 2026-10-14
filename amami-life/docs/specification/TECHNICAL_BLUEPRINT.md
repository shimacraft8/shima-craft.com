# 技術設計 — Expo + Cloudflare を起点に、契約のある安全な取得経路へ

## 提案スタック（採用は調査後）

- Mobile: Expo/React Native + TypeScript、Expo Router等によるネイティブ画面、ローカル永続化はSQLite/セキュアストレージ用途別。
- Backend: Cloudflare WorkersでAPIゲートウェイ・キャッシュ・レート制御。データ保存はD1等を必要に応じて検討。ステータス・事業者電話帳は管理更新ログ付き。
- Data ingestion: JMA XMLや正式API→スキーマ検証→イベント/訂正/取消の統合→キャッシュ→配信。外部APIをモバイルから一斉直接叩かない。
- Push: Expo Notifications/APNs/FCM等で**通常通知**を設計。緊急地震速報の秒単位保証が必要なら専用配信との契約を別途検討。初版では端末標準の緊急速報を代替しない。
- Observability: 失敗率、情報の鮮度、ソース別最終成功、アラート重複、配信遅延、クラッシュ率。
- Privacy: ログイン不要で開始。位置は手動選択がデフォルト。端末許可/保存期間/オプトイン管理を設計。

## ソース共有: SHIMA CRAFT既存サイト

既存 https://shima-craft.com/amami-tide は「奄美の潮と空」を公開し、気象庁の潮位表、府県天気予報、太陽計算に言及。**内部コードや本番APIは未確認**。Codexは読み取り権限がある既存のリポジトリを探すが、既存Webサービスへの破壊的変更は禁止。コードの所有者確認/テスト/契約確認後、既存サイトとアプリに共通スキーマのAPIを提供。

## フェイルセーフのデータ契約

```ts
export type Freshness = 'live' | 'recent' | 'stale' | 'unavailable' | 'unknown';
export type DataSourceStatus = {
  sourceId: string;
  officialUrl: string;
  issuedAt: string | null;   // 発表者が発表した時刻（ISO 8601）
  fetchedAt: string | null;  // サーバーが最後に取得した時刻
  checkedAt: string | null;  // 最後に取得を試みた時刻
  expiresAt: string | null;  // 表示鮮度の期限
  freshness: Freshness;
  supersedesId?: string | null;
  cancelled?: boolean;
  partial?: boolean;
};
```

- `fetchedAt`のみで「警報が最新/なし」と扱わない。対象電文の`issuedAt`と、対象区域の現行状態を別途管理。
- 状態：**未取得 / 発表なしが確認できた / 発表あり / 解除 / 訂正 / ソース停止 / 期限切れ / 不明** を区別。
- 重要イベントは元電文・発表ID・発表元・地域コード・発表時刻・内容バージョン・最新フラグの履歴を保持。
- タイムゾーンは格納UTC/表示Asia/Tokyo。フォーマットの`08: 1`のような欠落ゼロは禁止。
- 端末位置情報を利用する場合も取得失敗/拒否/都市未検出のときに手動エリア選択可能。

## データ取得戦略

- JMA: XML PULLフィードは随時取得だが**無停止・秒単位即時ではない**。取得頻度は公式仕様や運用条件を優先。2026年の仕様改訂をチェック。
- P2P地震情報：履歴と速報イベントの意味・API規約を確認。速報と地震後の震度情報は型から分離。
- 空港・船・バス：公式情報に導くMVPは可。API/再配信/アプリ内表示が必要なら事業者と合意し、承認の記録を残す。
- POI: 自前承認済みの店舗台帳を優先。地図プロバイダーは規約、価格、引用義務、オフライン権利を比較して決定。公共OSMタイルサーバーからの事前一括ダウンロードは禁止。

## 推奨API（候補、実装前契約確定）

- `GET /v1/today?area=naze&date=YYYY-MM-DD` → 天気/太陽/潮汐サマリ、取得状態
- `GET /v1/solar?lat=...&lon=...&date=...` → 時刻/方位/標準時を返す
- `GET /v1/tides?station=...&date=...` → 発表・実測/予測/補間区分付き
- `GET /v1/weather?area=...` → 公式発表の要約と出典
- `GET /v1/cyclones` → **現在のシステム一覧**（単なる直近の発表履歴ではない）と監視対象の状態
- `GET /v1/hazards?area=...` → 地震/津波・気象警報、時刻・ソースの鮮度
- `GET /v1/transport` → 検証済み事業者・公式リンクと電話番号
- `GET /v1/places?category=...&area=...` → 出典/最終確認日時付きPOI
- `GET /v1/service-health` → 情報源の状態、最新取得/発表時刻、障害

認証管理機能は一般ユーザーとは分離。一般ユーザーの個人情報やログを外部公開しない。APIはレート制限、厳格な入力検証、機密設定管理、許可リスト、障害時キャッシュポリシーを実装。

## 旧コードからの流用ルール

- `reference/legacy-v0.3/src/solar.ts` は位置/夏時間/JST/方位角の検証後に移植。
- `src/earthquake.ts` はP2P APIの型と改訂/解除データの試験を追加後に移植。
- `src/cyclone.ts` & `worker/` は**過去発表の収集試作**。動作しても「現行の安全判定」に流用しない。
- `src/data.ts` のタクシー/運転代行の番号は**公開前に再確認**。正確と断言しない。
- `App.tsx` のUIは採用しない。画面分割・ネイティブナビ・デザインシステムを最初から作る。

## リポジトリ/デプロイ安全ルール

Codex開始時に `pwd`, `git status --short`, `git remote -v`, `gh auth status`, `gh api user --jq '{login,email}'` を確認。機密ファイル `.env*`, `*.key`, `credentials`, `google-services.json` などはGitから除外。既存本業や顧客案件のリポジトリにプッシュしない。GitHub、Cloudflare、Expo/EAS各アカウントの一致を人が確認するまでpush/deploy禁止。公開は別途明示指示。
