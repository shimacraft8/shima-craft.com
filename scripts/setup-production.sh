#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 会員制カラー化サービス 本番セットアップ（1回だけ実行）
#
# 前提:
#   - supabase CLI ログイン済み（supabase projects list が通ること）
#   - vercel CLI ログイン済み
#   - このリポジトリのルートで実行
#
# 実行内容（すべて表示なしで秘密値を受け渡します）:
#   1. Supabase本番プロジェクトへ auth設定を反映（公開サインアップ無効化・URL設定）
#   2. migration を本番DBへ適用
#   3. 本番のURL/anonキー/Service Role KeyをVercel環境変数へ登録
#   4. 初期管理者（INITIAL_ADMIN_EMAIL）へ招待メールを送信
#
# 使い方:
#   INITIAL_ADMIN_EMAIL=<管理者メール> bash scripts/setup-production.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="wlpcbrbeeepoopjeipci"
SITE_URL="https://shima-craft.com"

if [ -z "${INITIAL_ADMIN_EMAIL:-}" ]; then
  echo "INITIAL_ADMIN_EMAIL を指定してください。例:" >&2
  echo "  INITIAL_ADMIN_EMAIL=you@example.com bash scripts/setup-production.sh" >&2
  exit 1
fi

echo "== 1/4 Supabase link & auth設定の反映 =="
SUPABASE_AUTH_SITE_URL="$SITE_URL" supabase link --project-ref "$PROJECT_REF"
SUPABASE_AUTH_SITE_URL="$SITE_URL" supabase config push --yes

echo "== 2/4 migrationの適用 =="
SUPABASE_AUTH_SITE_URL="$SITE_URL" supabase db push --yes

echo "== 3/4 Vercel環境変数の登録（値は表示されません） =="
KEYS_JSON=$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json)
ANON_KEY=$(echo "$KEYS_JSON" | python3 -c "import json,sys; ks=json.load(sys.stdin); print(next(k['api_key'] for k in ks if k['name']=='anon'))")
SERVICE_KEY=$(echo "$KEYS_JSON" | python3 -c "import json,sys; ks=json.load(sys.stdin); print(next(k['api_key'] for k in ks if k['name']=='service_role'))")
SUPA_URL="https://${PROJECT_REF}.supabase.co"

for ENVNAME in production preview; do
  vercel env rm NEXT_PUBLIC_SUPABASE_URL "$ENVNAME" --yes 2>/dev/null || true
  vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY "$ENVNAME" --yes 2>/dev/null || true
  vercel env rm SUPABASE_SERVICE_ROLE_KEY "$ENVNAME" --yes 2>/dev/null || true
  printf '%s' "$SUPA_URL"    | vercel env add NEXT_PUBLIC_SUPABASE_URL "$ENVNAME"
  printf '%s' "$ANON_KEY"    | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "$ENVNAME"
  printf '%s' "$SERVICE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY "$ENVNAME"
done

echo "== 4/4 初期管理者の作成（招待メール送信・再実行安全） =="
NEXT_PUBLIC_SUPABASE_URL="$SUPA_URL" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY" \
SITE_URL="$SITE_URL" \
INITIAL_ADMIN_EMAIL="$INITIAL_ADMIN_EMAIL" \
node scripts/create-initial-admin.mjs

echo ""
echo "完了しました。次の手順:"
echo "  1. git push origin main （Vercelが自動デプロイ）"
echo "  2. ${INITIAL_ADMIN_EMAIL} に届いた招待メールからパスワードを設定"
echo "  3. https://shima-craft.com/admin で管理画面を確認"
echo ""
echo "推奨（メール送信の安定化）: SupabaseダッシュボードのAuth > SMTP で"
echo "  Resend SMTP (smtp.resend.com / user: resend / pass: RESEND_API_KEY) を設定"
