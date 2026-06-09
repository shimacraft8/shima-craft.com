# SHIMA CRAFT

鹿児島・離島の事業者さん向けに、Web制作・空撮・映像制作をまるごとサポートするフリーランス「SHIMA CRAFT」のポートフォリオサイトです。1ページ完結の縦スクロール構成。

- **フレームワーク**: Next.js 14（App Router）/ TypeScript
- **スタイル**: Tailwind CSS ＋ `app/globals.css`（デザイントークン・コンポーネントスタイル）
- **アニメーション**: Framer Motion（スクロール登場・カウントアップ・アコーディオン・モーダル）
- **フォント**: `next/font/google`（見出し Noto Serif JP / 本文 Noto Sans JP / 英字 Outfit）
- **デプロイ前提**: Vercel

---

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:3000> を開きます。

### 本番ビルド

```bash
npm run build
npm run start
```

---

## 環境変数

`.env.example` を `.env.local` にコピーして設定します。どちらも任意（未設定でも動作します）。

| 変数名 | 用途 | 例 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | OGP・sitemap・robots・canonical のベースURL | `https://shima-craft.vercel.app` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 の測定ID。未設定なら GA を読み込まない | `G-XXXXXXXXXX` |

```bash
cp .env.example .env.local
```

---

## よく変更する箇所

- **お問い合わせ先メールアドレス**: [`app/lib/site.ts`](app/lib/site.ts) の `email` を1か所書き換えるだけで、ヒーロー／お問い合わせ／プライバシーポリシー／構造化データすべてに反映されます。現在は `shimacraftwork@gmail.com`。
- **本番URL**: 環境変数 `NEXT_PUBLIC_SITE_URL`（未設定時は `site.ts` の既定値）。
- **デザイントークン（カラー）**: [`app/globals.css`](app/globals.css) の `:root` と [`tailwind.config.ts`](tailwind.config.ts)。
- **各セクションの文言**: `app/components/` 配下の各コンポーネント（`About` `Service` `Flow` `Price` `Faq` `Contact` ほか）。

---

## 画像素材

`public/` に配置：

| ファイル | 用途 |
|---|---|
| `logo.png` | カラー版ロゴ（ヘッダー・スクロール後／フッター） |
| `logo-white.png` | 白版ロゴ（ヒーロー上のヘッダー） |
| `hero.jpg` | ヒーロー背景の空撮写真。OG画像にも流用 |

使用画像はこの3点（提供素材）のみです。

---

## ディレクトリ構成

```
app/
  layout.tsx          メタデータ/OGP/JSON-LD/GA4/フォント
  page.tsx            1ページ分のセクション組み立て
  globals.css         デザイントークン＋コンポーネントスタイル
  sitemap.ts          /sitemap.xml
  robots.ts           /robots.txt
  lib/site.ts         サイト共通設定（メール・URL等）
  components/         Header / Hero / About / Service / Flow / Price /
                      Faq / Contact / Footer / PrivacyPolicy /
                      CustomCursor / StickyContact / Reveal / GoogleAnalytics
public/               logo.png / logo-white.png / hero.jpg
```

---

## Vercel へのデプロイ

1. このリポジトリを GitHub（等）にプッシュ。
2. [Vercel](https://vercel.com/new) で対象リポジトリをインポート。Framework は自動で **Next.js** を検出します（追加設定不要）。
3. **Environment Variables** に必要なら以下を設定：
   - `NEXT_PUBLIC_SITE_URL`（本番ドメイン。例 `https://shima-craft.com`）
   - `NEXT_PUBLIC_GA_ID`（GA4を使う場合）
4. **Deploy** を実行。以降は push のたびに自動デプロイされます。
5. 独自ドメインは Vercel の **Settings → Domains** から追加。設定後、`NEXT_PUBLIC_SITE_URL` を本番ドメインに更新して再デプロイすると、OGP・sitemap が正しいURLになります。

---

## アクセシビリティ / その他

- `prefers-reduced-motion` を尊重し、モーション低減設定時はアニメーションを抑制します。
- カスタムカーソルは PC（`pointer: fine`）のみ。スマホには画面下の固定CTAを表示します。
- 全画像に `alt` を付与済み。
