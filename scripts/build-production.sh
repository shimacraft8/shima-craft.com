#!/usr/bin/env bash
# 本番（Cloudflare Custom Domain）向けビルド専用スクリプト。
#
# next buildは完全静的生成ページ（generateStaticParams/revalidateなしのページ）を
# ビルド時に一度だけレンダリングしてHTMLへ焼き込む。CF_ENVはCloudflare Workersの
# ランタイムバインディング（wrangler.jsoncのvars）でしか渡らないため、素の
# `npm run cf:build` を実行するだけでは、このシェルにCF_ENVが存在せず、
# 完全静的ページ側の本番判定（isProduction）が常にfalseになってしまう
# （GA4スクリプトが一部ページで出ない不具合として実機で発覚・2026-08-09）。
# revalidate付きページはリクエスト時に実行時binding経由で正しく再評価されるため
# 気づきにくい。本番向けビルドでは必ずこのスクリプト経由でCF_ENVを渡すこと。
set -euo pipefail
cd "$(dirname "$0")/.."

GA_ID="$(node -e '
const fs = require("fs");
const dotenv = require("dotenv");
try {
  const parsed = dotenv.parse(fs.readFileSync(".dev.vars", "utf8"));
  process.stdout.write(parsed.NEXT_PUBLIC_GA_ID || "");
} catch {
  process.stdout.write("");
}
')"

CF_ENV=production NEXT_PUBLIC_GA_ID="$GA_ID" npm run cf:build
