#!/usr/bin/env bash
# 【廃止】Supabase方式の本番セットアップは廃止されました。
# 会員制カラー化サービスは Firebase Authentication + Cloud Firestore へ移行しています。
# 新しいセットアップは scripts/setup-firebase-production.sh を使用してください。
echo "このスクリプトは廃止されました（Supabase方式は使用しません）。" >&2
echo "Firebase 版のセットアップは次を実行してください:" >&2
echo "  FIREBASE_PROJECT_ID=<専用プロジェクトID> INITIAL_ADMIN_EMAIL=<管理者メール> bash scripts/setup-firebase-production.sh" >&2
echo "詳細は docs/photo-colorize/firebase-production-checklist.md を参照してください。" >&2
exit 1
