#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 会員制カラー化サービス Firebase 本番セットアップ（再実行安全）
#
# 前提:
#   - firebase CLI ログイン済み（npx firebase-tools login:list が通る）
#   - vercel CLI ログイン済み・このリポジトリが shima-craft-com にリンク済み
#   - 専用 Firebase プロジェクトを作成済み（既存の他プロジェクトは使わない）
#   - サービスアカウント鍵JSONのパスを SERVICE_ACCOUNT_JSON で渡す（任意・Vercel env登録用）
#
# 使い方:
#   FIREBASE_PROJECT_ID=<専用ID> INITIAL_ADMIN_EMAIL=<管理者メール> \
#   [SERVICE_ACCOUNT_JSON=/path/to/key.json] bash scripts/setup-firebase-production.sh
#
# このスクリプトが行うこと（秘密値は表示しません）:
#   1. 対象リポジトリ / Vercelプロジェクト / Firebaseプロジェクトの確認
#   2. Supabase/禁止プロジェクトへアクセスしないことを保証
#   3. Firestore deny-all rules と indexes を deploy
#   4. Firebase Web設定・Admin資格情報を Vercel env(production/preview)へ登録
#   5. INITIAL_ADMIN_EMAIL / NEXT_PUBLIC_SITE_URL / COLORIZE_ENABLED を登録
#   6. Resend 環境変数の存在確認（招待メール用）
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

FORBIDDEN_SUPABASE_REF="wlpcbrbeeepoopjeipci"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://shima-craft.com}"

: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID（専用Firebaseプロジェクトのproject id）を指定してください}"
: "${INITIAL_ADMIN_EMAIL:?INITIAL_ADMIN_EMAIL（初期管理者のメール）を指定してください}"

echo "== 0/6 安全確認 =="
if [ ! -f "package.json" ] || ! grep -q '"name": "shima-craft"' package.json; then
  echo "対象リポジトリが SHIMA CRAFT ではありません。中断します。" >&2; exit 1
fi
if [ "$FIREBASE_PROJECT_ID" = "$FORBIDDEN_SUPABASE_REF" ]; then
  echo "禁止されたプロジェクト参照です。中断します。" >&2; exit 1
fi
if command -v vercel >/dev/null 2>&1; then
  LINKED=$(python3 -c "import json;print(json.load(open('.vercel/project.json')).get('projectName',''))" 2>/dev/null || echo "")
  if [ -n "$LINKED" ] && [ "$LINKED" != "shima-craft-com" ]; then
    echo "Vercelリンク先が shima-craft-com ではありません（$LINKED）。中断します。" >&2; exit 1
  fi
fi

FB="npx --yes firebase-tools@latest"

echo "== 1/6 Firebaseプロジェクトの存在確認 =="
$FB projects:list | grep -q "$FIREBASE_PROJECT_ID" || {
  echo "Firebaseプロジェクト $FIREBASE_PROJECT_ID が見つかりません。先に作成してください。" >&2; exit 1; }

echo "{\"projects\":{\"default\":\"$FIREBASE_PROJECT_ID\"}}" > .firebaserc

echo "== 2/6 Firestore rules / indexes を deploy =="
$FB deploy --only firestore:rules,firestore:indexes --project "$FIREBASE_PROJECT_ID"

echo "== 3/6 Vercel環境変数の登録（値は表示されません） =="
add_env() { # name value
  local name="$1"; local val="$2"
  for ENVNAME in production preview; do
    vercel env rm "$name" "$ENVNAME" --yes >/dev/null 2>&1 || true
    printf '%s' "$val" | vercel env add "$name" "$ENVNAME" >/dev/null
  done
  echo "  registered: $name"
}

# Firebase Web設定（NEXT_PUBLIC_*）— 手元の値を環境変数から受け取る
for key in NEXT_PUBLIC_FIREBASE_API_KEY NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN NEXT_PUBLIC_FIREBASE_PROJECT_ID NEXT_PUBLIC_FIREBASE_APP_ID NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID; do
  val="${!key:-}"
  if [ -n "$val" ]; then add_env "$key" "$val"; else echo "  skip(empty): $key（Firebase ConsoleのWeb App設定から後で登録してください）"; fi
done

# Admin資格情報（server-only）: サービスアカウントJSONから抽出
if [ -n "${SERVICE_ACCOUNT_JSON:-}" ] && [ -f "$SERVICE_ACCOUNT_JSON" ]; then
  PID=$(python3 -c "import json;print(json.load(open('$SERVICE_ACCOUNT_JSON'))['project_id'])")
  CEMAIL=$(python3 -c "import json;print(json.load(open('$SERVICE_ACCOUNT_JSON'))['client_email'])")
  PKEY=$(python3 -c "import json;print(json.load(open('$SERVICE_ACCOUNT_JSON'))['private_key'])")
  add_env FIREBASE_PROJECT_ID "$PID"
  add_env FIREBASE_CLIENT_EMAIL "$CEMAIL"
  add_env FIREBASE_PRIVATE_KEY "$PKEY"
  echo "  （サービスアカウント鍵をenv登録しました。ローカルのJSONは安全に削除してください: rm '$SERVICE_ACCOUNT_JSON'）"
else
  echo "  skip: FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY（SERVICE_ACCOUNT_JSON未指定。Vercelへ手動登録してください）"
fi

add_env INITIAL_ADMIN_EMAIL "$INITIAL_ADMIN_EMAIL"
add_env NEXT_PUBLIC_SITE_URL "$SITE_URL"
add_env COLORIZE_ENABLED "true"

echo "== 4/6 Resend環境変数の確認 =="
vercel env ls production 2>/dev/null | grep -q "RESEND_API_KEY" && echo "  RESEND_API_KEY: 登録済み" || echo "  警告: RESEND_API_KEY 未登録（招待メールが送れません）"

echo ""
echo "完了。次の手順:"
echo "  1. Firebase Console → Authentication → Sign-in method で Google を有効化"
echo "  2. Authentication → Settings → Authorized domains に shima-craft.com を追加"
echo "  3. NEXT_PUBLIC_FIREBASE_* をまだ登録していなければ Vercel env に登録"
echo "  4. git push origin main（Vercel自動デプロイ）"
echo "  5. $INITIAL_ADMIN_EMAIL のGoogleアカウントで https://shima-craft.com/login からログイン → 初期adminが自動作成されます"
