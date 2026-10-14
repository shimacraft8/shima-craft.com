#!/bin/zsh
set -e
cd "${0:A:h}"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if [[ ! -x node_modules/.bin/expo ]]; then
  print '初回はこのフォルダで npm ci を実行してください。'
  read '?Enterで閉じます。'
  exit 1
fi
owned_api_pid=''
cleanup() {
  if [[ -n "$owned_api_pid" ]]; then kill "$owned_api_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
if ! curl -fsS http://localhost:4837/v1/service-health 2>/dev/null | /usr/bin/grep -q 'currentHazardsIntegrated'; then
  PORT=4837 HOST=127.0.0.1 node server/index.mjs &
  owned_api_pid=$!
fi
(
  cd apps/mobile
  EXPO_PUBLIC_API_BASE_URL=http://localhost:4837 EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 ../../node_modules/.bin/expo export --platform web --output-dir ../../research/native-export-v031
)
print '\nアプリ版プレビュー：http://localhost:4901/'
print '閲覧中はこのターミナルを開いたままにしてください。iPhone実機のプレビューではありません。'
if curl -fsS http://localhost:4901/ 2>/dev/null | /usr/bin/grep -q 'AMAMI'; then
  read '?起動済みです。閲覧を終えたらEnterで閉じます。'
else
  python3 server/native-preview.py --directory research/native-export-v031 --port 4901
fi
