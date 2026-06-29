/**
 * サイト全体で使い回す設定値。
 * お問い合わせ先メールアドレスを変えたいときは、ここの `email` を1か所書き換えるだけでOKです。
 */
export const site = {
  name: "SHIMA CRAFT",
  title: "SHIMA CRAFT｜奄美・鹿児島の小規模事業者向けWeb制作",
  description:
    "奄美大島・鹿児島の小規模事業者向けに、ホームページ制作・リニューアル、Web集客導線、写真・動画、予約・顧客管理などを支援します。",
  /** お問い合わせ先メールアドレス（mailto・構造化データ・プライバシーポリシーで共通利用） */
  email: "shimacraft8@gmail.com",
  /** 本番URL。Vercel等の環境変数 NEXT_PUBLIC_SITE_URL で上書きできます。 */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://shima-craft.com",
  /** 対応エリア（構造化データ areaServed 用） */
  areaServed: "奄美大島（鹿児島県）",
  ogImage: "/hero.jpg",
} as const;

/** mailto: リンクを組み立てるヘルパー */
export const mailtoHref = `mailto:${site.email}`;
