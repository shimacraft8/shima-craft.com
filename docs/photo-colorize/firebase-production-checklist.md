# 会員制カラー化サービス（Firebase）本番公開チェックリスト

作成日: 2026-07-04
状態: **コード・テストは完成済み。以下の手動ステップ後に公開できます。**

コードは `origin/main` へ push 済み。ただし Firebase の環境変数が Vercel に無い状態では
`/tools/photo-colorize`・`/login`・`/admin` などが500になるため、**必ず 1 → 4 の順で実施してください。**

## 1. Firebase プロジェクト作成（Firebase Console・約3分）

1. https://console.firebase.google.com → 「プロジェクトを追加」
   - プロジェクト名: `SHIMA CRAFT Members`（IDは `shima-craft-members` 等・使用中なら一意サフィックス）
   - Google Analytics: **無効**（不要）
   - 課金: **Sparkプランのまま**（従量課金リンク不要）
2. 左メニュー **Build → Firestore Database** → 「データベースを作成」
   - ロケーション: `asia-northeast1`（東京）／本番モードで作成
3. **Build → Authentication** → 「始める」→ Sign-in method → **Google を有効化**
   - プロジェクトのサポートメールを選択して保存
4. Authentication → **Settings → Authorized domains** に以下を追加
   - `shima-craft.com`
   - （使っていれば）`www.shima-craft.com`
   - 必要な Vercel Preview ドメイン（例: `*.vercel.app` は不可なので個別に）
   - `localhost` は既定で入っています
5. **プロジェクト設定（⚙）→ 全般 → マイアプリ → Web アプリを追加**（`</>`）
   - アプリ登録後に表示される `firebaseConfig` の値を控える
     （apiKey / authDomain / projectId / appId / messagingSenderId）
6. **プロジェクト設定 → サービス アカウント → 「新しい秘密鍵の生成」** で JSON をダウンロード
   （project_id / client_email / private_key が入っています。Gitには絶対に追加しない）

## 2. セットアップスクリプト（ターミナル・秘密値は表示されません）

```bash
cd "/Users/hiroshikento/Documents/SHIMA CRAFT"

# Firebase Web設定を環境変数で渡す（1.の値）
export NEXT_PUBLIC_FIREBASE_API_KEY=...
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
export NEXT_PUBLIC_FIREBASE_APP_ID=...
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...

FIREBASE_PROJECT_ID=<作成したプロジェクトID> \
INITIAL_ADMIN_EMAIL=fg.hiroshik@gmail.com \
SERVICE_ACCOUNT_JSON=/path/to/ダウンロードした鍵.json \
bash scripts/setup-firebase-production.sh

# 鍵JSONはenv登録後に安全に削除
rm /path/to/ダウンロードした鍵.json
```

スクリプトが行うこと: Firestore rules/indexes の deploy、Vercel env（production/preview）への
`NEXT_PUBLIC_FIREBASE_*` / `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` /
`INITIAL_ADMIN_EMAIL` / `NEXT_PUBLIC_SITE_URL` / `COLORIZE_ENABLED` の登録。

## 3. 招待メール（Resend）の確認

- `RESEND_API_KEY` / `RESEND_FROM` が Vercel env に登録済みであること（既存の問い合わせ機能で使用済み）。
- 本番の送信元は独自ドメイン認証済みアドレス（例 `noreply@shima-craft.com`）を推奨。

## 4. デプロイ & 初期管理者ログイン

```bash
git push origin main   # 既にpush済みなら Vercel で再デプロイ
```

デプロイ後:

1. `https://shima-craft.com/login` を開く
2. **fg.hiroshik@gmail.com** のGoogleアカウントでログイン
   → サーバーが「初期管理者」として自動的に admin member を作成（初回のみ・冪等）
3. `https://shima-craft.com/admin` が開けることを確認

## 5. Smoke Test（本番）

- `/`, `/services`, `/privacy`, `/sitemap.xml` が200
- `/tools/photo-colorize` … 未ログインは説明ページ+ログイン導線のみ（カラー化UIなし・モデルDLなし）
- `/login` … Googleログイン
- 未ログインで `/admin` → `/login` へリダイレクト
- 一般ユーザーで `/admin` → 404
- admin でログイン → 管理画面・招待・停止・再開・ログが動作
- テストユーザーを1名招待 → 招待メールのリンクからGoogleログイン → payment_pending で利用不可
- 契約状態を active に変更 → カラー化成功 → 同じ画像で再試行 → ダウンロード操作 → 利用ログ確認

## 6. 不要になった旧環境変数（Vercelから削除可・値は表示せず削除）

コード参照が無いことを確認済み:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `TRIAL_FREE_LIMIT` / `TRIAL_IP_LIMIT` / `TRIAL_TICKET_SECRET`
- `REPLICATE_API_TOKEN` / `REPLICATE_DDCOLOR_VERSION`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
- `COLORIZE_DAILY_LIMIT` / `COLORIZE_MAX_BYTES` / `COLORIZE_GLOBAL_DAILY_LIMIT` / `COLORIZE_RATE_LIMIT_SALT`

**注意**: `wlpcbrbeeepoopjeipci`（別システムのSupabase）には一切触れないこと。

## 7. 運用手順

### 20ユーザーを追加する
1. `/admin/users` →「＋ 新規ユーザーを招待」
2. メール（Googleアカウント）・表示名・role（通常「一般」）・契約状態を入力して招待
   - 入金前は「支払い確認中」（利用不可）で作成 → 入金確認後に「契約中」へ変更
3. 招待メールのリンクから本人がGoogleログイン → 会員化
4. 招待の再送・取消は `/admin/invitations`

### ユーザーの停止・再開・削除
- `/admin/users/<uid>` の詳細画面から
  - **停止**: ログイン即遮断（Firebase Auth disabled + token失効）。契約未確認時に推奨
  - **再開**: 再びログイン可能に
  - **削除**: soft delete（無効化）。ログは保持。削除より停止を推奨
- 最後の有効管理者は降格・停止・削除できません（DB transactionで保護）

### 料金は「要問い合わせ」運用
- 画面には固定料金を出さず、「利用について問い合わせる」ボタンで個別案内
- 契約状態（active/payment_pending/unpaid/cancelled）で利用可否を管理
