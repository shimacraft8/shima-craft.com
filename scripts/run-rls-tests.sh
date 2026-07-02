#!/usr/bin/env bash
# ローカルSupabaseに対してRLS統合テストを実行する。
# 使い方: npm run test:rls （事前に supabase start が必要）
set -euo pipefail
cd "$(dirname "$0")/.."

STATUS_JSON=$(supabase status -o json 2>/dev/null || true)
if [ -z "$STATUS_JSON" ]; then
  echo "ローカルSupabaseが起動していません。先に 'supabase start' を実行してください。" >&2
  exit 1
fi

export RLS_TEST_SUPABASE_URL=$(echo "$STATUS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['API_URL'])")
export RLS_TEST_ANON_KEY=$(echo "$STATUS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['ANON_KEY'])")
export RLS_TEST_SERVICE_ROLE_KEY=$(echo "$STATUS_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

exec npx vitest run --config vitest.rls.config.ts "$@"
