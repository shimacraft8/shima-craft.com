# 作業2: Vercel設定・DNS調査 結果（読み取りのみ）

## Vercelプロジェクト（.vercel/project.json より、非秘匿情報）
- projectId: `prj_Au8JJ8CPk2HONz4weS6WduWFx6vi`
- orgId (team): `team_gbTBFTqoqctbpVl9MYT81jTx`
- projectName: `shima-craft-com`
- `vercel.json`: リポジトリルートには存在しない（同居する独立サブプロジェクト`shima-line-operations-complete/`のみ独自vercel.jsonを持つが本体とは無関係）
  → Cron / Functions設定 / rewrites等のVercel固有設定はプロジェクトデフォルトのみと推定

## Vercel CLI認証状態
- インストール済み: Vercel CLI 53.4.0
- `vercel whoami` → **未認証**（Not authorized）
- `vercel login`を試行 → デバイスコード方式のブラウザ認証が必要（`https://vercel.com/oauth/device?user_code=...`）。ユーザー本人の承認が必要なため、Claudeからは完了できず中断。
- → Vercel Production環境変数の正式な一覧・値、Cron/Functions設定の画面上確認は、ユーザーが`vercel login`するか、Vercelダッシュボードで確認する必要あり。

## DNSレコード一覧（dig、複数リゾルバで確認：システムデフォルト/1.1.1.1/8.8.8.8）

| 種別 | 値 |
|---|---|
| NS | ns1.vercel-dns.com, ns2.vercel-dns.com |
| A (apex) | 64.29.17.1, 216.198.79.1 |
| AAAA (apex) | なし |
| CNAME (apex) | なし（適用不可） |
| MX | **なし（0件）** |
| TXT (apex) | **なし（0件）** |
| CAA | issue "letsencrypt.org" / issue "pki.goog" / issue "sectigo.com" |
| SRV | なし |
| DNSSEC (DS/DNSKEY) | **なし＝DNSSEC無効** |
| SOA | ns1.vercel-dns.com / hostmaster.nsone.net |
| www A | 64.29.17.65, 216.198.79.65（apexと異なるIP） |
| \_dmarc, \*.\_domainkey等 | 全て0件 |

### 重要な所見
1. **MXレコードが存在しない** → このドメインではメールを一切運用していない。SPF/DKIM/DMARCも0件。移行時に「メール関連DNSを失わないこと」への該当レコードは現状ゼロ（＝失うものがない）。
2. **DNSSEC無効** → ネームサーバー切替時の最大リスク要因（DSレコードの整合待ち）は今回該当しない。
3. **`https://www.shima-craft.com`はTLS証明書がapexのみでwwwを含まない**（SAN不一致でSSLハンドシケーク失敗）。DNS的にはwww用のAレコードが存在する（Vercelのエッジには到達する）が、Vercelプロジェクトにドメインとして正式追加されていない可能性が高い。→ これは移行前から存在する既存の状態。Cloudflareでは apex/www 両方を正しくカバーするようにする。
4. Search Console確認用と思われるTXTレコードは検出されず → Search Console検証はDNS方式ではなく別方式（HTMLファイル/Google Analytics連携等）と推定。Search Consoleの現在の確認方法は本番切替前にダッシュボードで要確認（DNS移行では影響しない見込みだが、念のため）。

## WHOIS（公開情報）
- Registrar: **Name.com, Inc.**（VercelのドメインはバックエンドでName.com経由。ユーザー操作は引き続きVercelダッシュボードのみで行う想定で問題なし）
- Registry Expiry Date: 2027-06-09
- Domain Status: clientTransferProhibited（移管ロック中＝安全側）
- Auto-renewのON/OFFはWHOISからは確認不可 → Vercelダッシュボードの Domains 画面でユーザーに確認を依頼する必要あり（作業16の完了報告項目23に対応）

## コード内のVercel依存（作業5と重複するが先出し）
- `middleware.ts`: Edge runtime想定のシンプルなCookie存在チェックのみ。Node専用APIなし。Cloudflare Workers (OpenNext)でも変更不要と見込み。
- `app/components/GoogleAnalytics.tsx`: **`process.env.VERCEL_ENV === "production"`にGA4発火が依存**。Cloudflareには`VERCEL_ENV`が存在しないため、このままではGA4が本番でも発火しなくなる。作業4/5で対応必須（最小差分での置換が必要）。

## 環境変数（コードから抽出した使用中の名前一覧）
`.env.example`に定義済み、かつコードで参照されているもの：
NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_GA_ID, RESEND_API_KEY, RESEND_FROM,
NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID,
NEXT_PUBLIC_FIREBASE_APP_ID, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_SESSION_COOKIE_NAME,
INITIAL_ADMIN_EMAIL, ADMIN_EMAIL_ALLOWLIST, INVITATION_TOKEN_SECRET, LOG_IP_HASH_SALT,
COLORIZE_ENABLED, GROQ_API_KEY, MICROCMS_SERVICE_DOMAIN, MICROCMS_API_KEY

コードで参照されているが`.env.example`未記載のもの（要確認）：
AMAMI_EMBED_API_KEY, COLORIZE_REQUIRE_LOGIN, FIRESTORE_EMULATOR_HOST（開発用と推定）

Vercelプラットフォームが自動注入する変数（手動移行不要、Cloudflare側で別途対応）：
NODE_ENV, VERCEL_ENV（要置換対応）

### 要注意：ローカル`.env.local`の不審な内容
`.env.local`に`DATABASE_URL` / `POSTGRES_*` / `NEON_*` / `VERCEL_OIDC_TOKEN` / `ANTHROPIC_API_KEY`が
存在するが、**コード内のどこからも参照されていない**（grep で0件）。
これらはこのアプリの動作には無関係と判断し、今回のCloudflare移行対象には含めない。
値は一切表示・記録していない。ユーザー側で心当たりがなければ、別件の設定漏れの可能性があるため
念のため確認を推奨（今回の移行スコープ外のため対応はしない）。
