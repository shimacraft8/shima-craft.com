#!/bin/zsh
set -eu
cd -- "$(dirname -- "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if amami_preview_page="$(curl --fail --silent --max-time 2 http://127.0.0.1:4837/)" && [[ "$amami_preview_page" == *'<title>AMAMI LIFE'* ]]; then
  printf '\nAMAMI LIFEは起動済みです。\nこのMacのブラウザで開いてください：\nhttp://localhost:4837/\n\n'
  read -r '?Returnキーでこのウィンドウを閉じます。'
  exit 0
fi

printf '\nAMAMI LIFEを起動します。\nこのMacのブラウザで http://localhost:4837/ を開いてください。\n閲覧中はこのターミナルを開いたままにしてください。終了はControl+Cです。\n\n'
exec npm start
