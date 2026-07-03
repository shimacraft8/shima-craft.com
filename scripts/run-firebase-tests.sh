#!/usr/bin/env bash
# Firebase Emulator を起動して統合テストを実行する。
# 使い方: npm run test:firebase
# 前提: Java(JRE)が必要。無い場合は brew install openjdk 等で導入してください。
set -euo pipefail
cd "$(dirname "$0")/.."

# JavaをPATHへ（Homebrew openjdk を探す）
for JHOME in /usr/local/opt/openjdk /opt/homebrew/opt/openjdk; do
  if [ -x "$JHOME/bin/java" ]; then export PATH="$JHOME/bin:$PATH"; fi
done
if ! command -v java >/dev/null 2>&1; then
  echo "Java(JRE)が見つかりません。Firebase Emulatorには Java が必要です（例: brew install openjdk）。" >&2
  exit 1
fi

export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-shima-craft-members-test}"
export GCLOUD_PROJECT="$FIREBASE_PROJECT_ID"

# emulators:exec の中でテストを走らせる（終了時にemulatorも停止・クリーンな状態）
exec npx --yes firebase-tools@latest emulators:exec \
  --project "$FIREBASE_PROJECT_ID" \
  --only auth,firestore \
  "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npx vitest run --config vitest.firebase.config.ts"
