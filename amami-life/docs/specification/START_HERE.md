# AMAMI LIFE | Codex開発キット（2026-10-13）

SHIMA CRAFTの奄美大島旅行・島民向けアプリを **iOS / Androidへ一般公開することを目標** とした、調査・設計・ローカル実装用の引継ぎパッケージです。

## これは何か

- `visual-prototype/index.html` — 新規アートディレクションによる**編集可能なHTML/CSS/JSの5画面デザイン試作**。オンラインの画像・Webフォントに依存しません。示している数値は2026-10-13の例示で、実際の最新情報ではありません。
- `docs/FEATURE_AUDIT.md` — 抜け漏れ調査とP0/P1/P2優先度。
- `docs/DATA_SOURCE_REGISTRY.csv` — 公的・事業者データの出典と確認ステータス。
- `docs/DESIGN_BRIEF.md` — 美術方針、フォント、コンポーネント、アンチパターン、品質基準。
- `docs/TECHNICAL_BLUEPRINT.md` — アプリ・API・DB・通知・オフラインの設計。
- `docs/ACCEPTANCE_TESTS.md` — 実装時の必須テスト、異常系、公開判定。
- `docs/RIGHTS_AND_RELEASE.md` — データ利用・位置情報・Apple/Google・名義の論点。
- `docs/CODEX_TASK.md` — **Codexにそのまま貼る主指示文**。
- `docs/DECISIONS_NEEDED.md` — 開発前に決めたい事項と承認ゲート。
- `reference/legacy-v0.3/` — 前回試作の参考ソース。既存実装は全部正しいとは限らないため**移植前に監査**。
- `scripts/preflight.sh` — 作業ディレクトリ・Git・認証アカウントを変更せず確認するだけのスクリプト。

## Macでの利用（DownloadsからCodexへ）

ZIPをダウンロードするとMacの `~/Downloads` に入ります。FinderでZIPをダブルクリックして展開してから、ターミナルで以下を実行してください。

```bash
cd ~/Downloads/AMAMI-LIFE-Codex-Development-Kit-20261013
bash scripts/preflight.sh
open visual-prototype/index.html
codex
```

`codex` が使えない場合は、普段使用しているCodexの起動方法で、**この展開済みフォルダ**を作業フォルダとして開いてください。

起動したCodexに以下を貼り付けます。

> このフォルダ内の `docs/CODEX_TASK.md` を最優先で読んで、そこに記載された順序・制約・完了条件に従ってAMAMI LIFEを構築してください。まず資料と旧試作を監査し、UI案・データ連携と実装計画を提示した後、承認が不要なローカル実装とテストまで進めてください。GitHubアカウントや公開先の確認なくpush/公開しないこと。完成度を自己申告せず検証結果で報告してください。

**補足**：Codexに本ZIPを渡しただけでは、SHIMA CRAFTの非公開リポジトリや本番Cloudflare設定は見えません。アクセス可能な元コードの場所はCodexの調査で特定する必要があります。

## 大事な区別

- このZIP = **開発指示書＋デザイン参考＋旧コード**。まだ一般公開可能な完成アプリではありません。
- 防災表示は失敗時に「警報なし」「安全」などと誤判定しない。常に発表元・発表時刻・取得時刻を区別。
- 端末での即時地震警報・津波警報の配信は品質保証が難しいため、正式な通知経路と実機試験が整うまで実装完了と扱わない。
- データ元の無断スクレイピング、未検証の電話番号公開、既存サイトの無断変更・デプロイは禁止。
- `reference/legacy-v0.3` と新UIの美術方針が衝突したら、**新UI/新設計が優先**。旧試作から採用するのは十分な検証済みの機能・パーサーのみ。
