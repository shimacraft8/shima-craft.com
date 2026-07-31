# Cloudflare移行 — 作業状況（2026-07-30時点、一時停止）

ユーザー判断により、Firebase Admin/Firestoreの互換性問題の検討のためここで一旦停止。
**破壊的操作は一切実施していない**（DNS変更・Vercel変更・ドメイン操作・R2作成いずれも未実施）。

## 現在地

- worktree: `../shima-craft-cloudflare-migration`（元の作業ディレクトリには一切触れていない）
- ブランチ: `feature/cloudflare-migration-20260730`（origin/main = `a30d680` から作成、コミットはまだゼロ）
- 全変更は未コミット（`git status`で確認可能）
- Cloudflareアカウント: `shimacraft8@gmail.com`（wrangler CLIログイン済み、Account ID: `42f69e35f08bb21dca5194467e2f59de`）
- Vercel側: 一切変更なし。Vercel CLIはユーザー判断で未ログイン（環境変数は必要になった時点で直接Cloudflareへ入力する方針）

## 完了した作業（作業0〜6、作業7の一部）

1. **隔離worktree作成**（作業0）
2. **本番状態のbefore記録**（作業1）— `migration-report/before/` に主要ページのHTML・ヘッダー・JSON-LD・ads.txt・robots.txt・sitemap.xmlを保存済み。重要な既存事実:
   - MXレコード0件（メール運用なし）、TXTレコード0件、DNSSEC無効 → ネームサーバー切替のリスクは低い
   - `https://www.shima-craft.com`は現在SSL証明書がapex分のみでSAN不一致により接続不可（移行前からの既存状態）
   - レジストラは技術的にはName.com経由（Vercel Domainsのバックエンド）。ユーザー操作は引き続きVercelダッシュボードのみでよい
   - 詳細: `migration-report/before/investigation-notes.md`、`migration-report/before/dns-records.txt`
3. **OpenNext Cloudflare対応**（作業4）完了:
   - `@opennextjs/cloudflare@1.15.1`に固定（**重要**: 最新1.20.2はNext.js 15.5.21+必須でNext 14.2.35と非互換のため使用不可。1.15.xがNext14をサポートする最後の系統）
   - `wrangler.jsonc`, `open-next.config.ts` 新規作成
   - next/imageの最適化はCloudflare版のみ無効化（`unoptimized:true`）— Cloudflare Imagesは有料のため。Vercel側は無変更
   - `GoogleAnalytics.tsx`: `VERCEL_ENV`依存を`CF_ENV`とのOR条件に変更（Cloudflareでも本番判定できるように。Vercel側の挙動は不変）
   - `jose`パッケージの`workerd`解決エラーを`serverExternalPackages: ["jose"]`で解消（firebase-admin→jwks-rsa→joseの依存）
4. **ローカルビルド成功**: typecheck/lint/test:unit(203件)/`next build`/`opennextjs-cloudflare build`すべて成功

## 見つかった問題（作業7で発覚、DNS変更には進んでいない）

### 問題1: Firebase Admin SDK（Firestore）がCloudflare Workersで構造的に動作しない【確度: 高】

- 影響ページ: `/login`, `/admin/*`, `/tools/photo-colorize`, `/api/auth/session`, `/api/colorize/*` など認証を伴う全て
- エラー: `EvalError: Code generation from strings disallowed for this context`
- 原因: `firebase-admin` → `@google-cloud/firestore` → `google-gax`(gRPC) → `@grpc/proto-loader` → `protobufjs@7.6.4` の依存チェーン。protobufjsは性能のため`new Function()`による動的コード生成を行うが、Cloudflare Workersはセキュリティ上これを一律禁止（`nodejs_compat`でも回避不可）。
- モジュールのimport時点の副作用で発生するため、`isAdminConfigured()`等のガード（未設定時に安全側へ縮退する既存の設計）は効かない。
- 参考: [firebase-authentication-on-cloudflare-workers (dev.to)](https://dev.to/marplex/firebase-authentication-on-cloudflare-workers-24o3)、[cloudflare/next-on-pages#615](https://github.com/cloudflare/next-on-pages/issues/615)
- **正攻法の解決策**: `lib/firebase/admin.ts`のFirestoreアクセスをgRPC SDKからFirestore REST API直叩きに書き換える。認証・認可のコアなので、別セッションで慎重に設計・レビューすべき。

### 問題2: `/blog/[slug]`（ブログ記事詳細）が500【確度: 中〜低・要再検証】

- エラー: `DYNAMIC_SERVER_USAGE`
- **重要な留保**: ローカルテストではmicroCMSの認証情報を意図的に空にしていたため（`.dev.vars`）、正しく検証できていない可能性が高い。`getAllBlogPostsForSitemap()`が空を返し`generateStaticParams()`が空配列になった結果、静的プリレンダーなしの状態でテストしてしまった可能性がある。
- 問題1のような「モジュールレベルの構造的非互換」ではなく、設定・ISR実装の相互作用の可能性がある。
- **次にやるべきこと**: 実際のmicroCMS認証情報（`MICROCMS_SERVICE_DOMAIN`, `MICROCMS_API_KEY`）を使って再ビルド・再検証する。それでも再現する場合は、OpenNext CloudflareのISR実装（`searchParams`使用＋`revalidate`の組み合わせ）固有の問題として切り分ける。

### 動作確認済み（問題なし）

トップページ、ブログ一覧（`/blog`）、奄美方言辞書、`/amami-tide`（潮位グラフ・天気・7日間表示・日付検索・出典表記まで完全）、services、privacy、about、system-samples、monitor、凪ノ宿LP、各種redirect設定、ads.txt/robots.txt/sitemap.xml。

### 副次的に見つけたインフラ制約（対応済み）

- Cloudflare WorkersのStatic Assetsは1ファイル25MiBまで。写真カラー化機能のONNXモデル・ONNXランタイムWASM（8ファイル、計約470MB、単体最大90MB）がこれを超過。
  - `public/.assetsignore`で該当8ファイルを除外し、`lib/colorization/browser/ortRuntime.ts`に`NEXT_PUBLIC_LARGE_ASSETS_BASE_URL`環境変数によるR2切替の仕組みを実装済み（未設定時=Vercelは無変更、設定時=R2の公開URLから配信）。
  - ただし**Cloudflare R2は現時点でこのアカウントで未有効化**（ダッシュボードでの一度きりの有効化が必要、`wrangler r2 bucket create`が`[code: 10042] Please enable R2 through the Cloudflare Dashboard`で失敗）。R2はISRキャッシュ（`NEXT_INC_CACHE_R2_BUCKET`）にも必要。
  - 再開時の手順: (1) dash.cloudflare.com → R2 → 有効化 → (2) `npx wrangler r2 bucket create shima-craft-com-cache` と `shima-craft-com-static-large` を作成 → (3) 後者に該当8ファイルをアップロードし公開URL化（`wrangler r2 bucket dev-url enable`, `wrangler r2 bucket cors`でCORS設定）→ (4) `.dev.vars`/wrangler secretに`NEXT_PUBLIC_LARGE_ASSETS_BASE_URL`を設定
- `compatibility_date`はインストール済みwranglerバイナリが対応する最新日付（当時"2026-07-29"）に合わせる必要があった（"today"の日付だとエラーになる場合がある）。

## 再開時のチェックリスト

1. Firebase Admin/Firestoreの対応方針を決める（REST化 / 分割構成 / 別案）
2. （方針確定後）R2をダッシュボードで有効化
3. 実microCMS認証情報で`/blog/[slug]`を再検証
4. 問題が解消したら 作業7 の残り（会員・カラー化機能を含む全ページの実機確認）→ 作業8（workers.devプレビュー）以降を継続
5. **DNS変更・Vercel側の変更は、上記すべてがクリーンになるまで着手しない**（ユーザー指示通り）
