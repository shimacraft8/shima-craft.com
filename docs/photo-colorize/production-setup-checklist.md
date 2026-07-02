# 会員制カラー化サービス 本番公開チェックリスト

作成日: 2026-07-03
状態: **コード・テストは完了済み。以下の手動ステップの後に公開できます。**

コードはローカルにコミット済みです（`origin/main` へは未push）。
Supabase環境変数がVercelに無い状態でpushすると対象ページが500になるため、
**必ず 1 → 2 の順で実施してください。**

## 1. 本番セットアップ（ワンコマンド）

```bash
cd "/Users/hiroshikento/Documents/SHIMA CRAFT"
INITIAL_ADMIN_EMAIL=<FG廣司さんのメールアドレス> bash scripts/setup-production.sh
```

このスクリプトが行うこと（秘密値は画面に表示しません）:

| # | 内容 | 対象 |
|---|---|---|
| 1 | auth設定の反映（公開サインアップ無効化 / site_url=https://shima-craft.com / redirect URL許可） | Supabase `wlpcbrbeeepoopjeipci` |
| 2 | migration適用（profiles / colorization_logs / admin_audit_logs / trial_events + RLS + トリガー） | 同上 |
| 3 | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` を production / preview に登録 | Vercel |
| 4 | 初期管理者へ招待メール送信 + role=admin 設定（再実行しても重複しない） | Supabase |

## 2. デプロイ

```bash
git push origin main
```

Vercelの自動デプロイ完了後、以下をSmoke Testしてください。

- https://shima-craft.com/tools/photo-colorize … お試しバーが表示される
- https://shima-craft.com/login … ログイン画面
- https://shima-craft.com/admin … 未ログインでログインへリダイレクト
- 招待メールからパスワード設定 → /admin が開ける
- 白黒写真を1枚カラー化（お試し or 管理者ログイン後）

## 3. 任意（推奨）の手動設定

| 項目 | 場所 | 内容 |
|---|---|---|
| SMTP（重要） | Supabaseダッシュボード → Authentication → SMTP | 標準SMTPは1時間あたり数通の制限があるため、20名招待の前にResendを設定: host `smtp.resend.com` / port 465 / user `resend` / pass = RESEND_API_KEYの値 / 送信元 `noreply@shima-craft.com`（Resend側でドメイン認証済みであること） |
| メールテンプレート | 同 → Email Templates | 招待・パスワード再設定メールの文面を日本語化 |
| ADMIN_EMAIL_ALLOWLIST | Vercel env（任意） | 管理画面への追加防御。カンマ区切りメール |
| TRIAL_FREE_LIMIT / TRIAL_IP_LIMIT | Vercel env（任意） | お試し回数の調整（既定3） |
| 不要env削除 | Vercel → Settings → Environment Variables | `REPLICATE_API_TOKEN` / `REPLICATE_DDCOLOR_VERSION` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` / `COLORIZE_DAILY_LIMIT` / `COLORIZE_MAX_BYTES` / `COLORIZE_GLOBAL_DAILY_LIMIT` / `COLORIZE_RATE_LIMIT_SALT`（コード参照なしを確認済み。値を表示せず削除可） |
| `COLORIZE_ENABLED` | Vercel env | 残す（`false`で提供一時停止・動的ページ化により再デプロイ不要で反映） |

## 4. 20ユーザー追加の運用手順

権限テスト完了後、管理画面から追加します（ダミーユーザーの自動作成はしません）。

1. SMTP（上記）を設定しておく
2. https://shima-craft.com/admin/users → 「＋ 新規ユーザーを作成」
3. メール・表示名・role（通常は「一般」）・契約状態（通常は「契約中」）・備考を入力
4. 「作成して招待メールを送る」→ 利用者本人が招待メールからパスワードを設定
5. 支払い未確認の利用者は契約状態を「支払い確認中」で作成（利用可）、
   未払いになったら「未払い」へ変更（利用不可・アカウントは残る）
6. 利用停止は「利用を停止する」（ログイン自体を遮断）。削除より停止を推奨
