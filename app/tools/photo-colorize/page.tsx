import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref, site } from "@/app/lib/site";
import { PhotoColorizeClient } from "./PhotoColorizeClient";

const PAGE_TITLE = "白黒写真を無料でカラー化｜古写真をAI着色 - SHIMA CRAFT";
const PAGE_DESC =
  "白黒写真をアップロードすると、AIが自然な色を推定して無料でカラー化。スマホで撮影した古写真にも対応。奄美発のSHIMA CRAFTが提供するブラウザツールです。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: "/tools/photo-colorize" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: "/tools/photo-colorize",
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [
      {
        url: "/hero.jpg",
        width: 1200,
        height: 630,
        alt: "奄美大島の空撮写真 — SHIMA CRAFT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESC,
    images: ["/hero.jpg"],
  },
};

const SUITABLE_PHOTOS = [
  "人物・家族写真（記念写真、集合写真など）",
  "建物・街並み・風景の写真",
  "スマートフォンで撮影・スキャンした古い写真",
  "明るさやコントラストがある程度残っている写真",
];

const TIPS = [
  "できるだけ明るく、ピントが合った状態でスキャン・撮影する",
  "折れ目やホコリの映り込みが少ないものを選ぶ",
  "極端に暗い・退色して輪郭が見えにくい写真は結果が曖昧になりやすい",
  "うまく仕上がらない場合は、別の写真や明るさを調整した画像で試す",
];

const NOTES = [
  "結果の色はAIによる推定です。当時の実際の色を正確に復元・保証するものではありません。",
  "人物の輪郭や構図を新しく生成する機能ではないため、顔や傷、破損箇所の修復・復元は行いません。",
  "アップロードした画像は、SHIMA CRAFTの学習データ・広告・制作事例へ無断で利用しません。",
  "自分が権利を持つ画像のみアップロードしてください。",
  "身分証、医療情報、住所など機微な情報が写り込んだ画像のアップロードは避けてください。",
  "カラー化処理のため、画像は外部のAI推論サービス（Replicate）へ送信される場合があります。詳しくはプライバシーポリシーをご確認ください。",
];

const FAQS = [
  {
    q: "本当に無料ですか？",
    a: "はい、無料でご利用いただけます。ただし費用暴走防止のため、1日あたりのご利用回数に上限を設けています。上限に達した場合は日付が変わってから再度お試しください。",
  },
  {
    q: "元の色を再現できますか？",
    a: "いいえ、正確な復元ではありません。AIが写真の濃淡から自然に見える色を推定して着色しており、当時の実際の色と一致することを保証するものではありません。",
  },
  {
    q: "写真は保存されますか？",
    a: "SHIMA CRAFT側で画像を恒久的に保存することはありません。カラー化処理のために外部のAI推論サービスへ画像を送信しますが、API経由のデータは一定時間後に自動的に削除される仕組みを利用しています。結果画像はブラウザ上で確認・保存でき、保存しない場合は再表示できなくなることがあります。",
  },
  {
    q: "スマホで撮影した古写真でも使えますか？",
    a: "はい、ご利用いただけます。アルバムの写真をスマートフォンのカメラで撮影・スキャンした画像でもカラー化できます。",
  },
  {
    q: "顔や傷も修復されますか？",
    a: "いいえ、顔の欠損修復や傷・破損箇所の修復は行いません。本ツールは色を推定するカラー化専用モデルを使用しており、人物や構図を新しく生成するものではありません。",
  },
  {
    q: "どの画像形式に対応していますか？",
    a: "JPEG・PNG・WebP形式に対応しています。GIF・SVGなど、その他の形式には対応していません。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "トップ", item: site.url },
        {
          "@type": "ListItem",
          position: 2,
          name: "白黒写真を無料でカラー化",
          item: `${site.url}/tools/photo-colorize`,
        },
      ],
    },
    {
      "@type": "WebApplication",
      name: "白黒写真カラー化ツール",
      url: `${site.url}/tools/photo-colorize`,
      applicationCategory: "PhotographyApplication",
      operatingSystem: "Any (Webブラウザ)",
      description: PAGE_DESC,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
      provider: {
        "@type": "Organization",
        name: site.name,
        url: site.url,
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
// Turnstileが設定されていなければ、無防備な実行を避けるためツール自体を無効表示にする
const toolEnabled = process.env.COLORIZE_ENABLED !== "false" && Boolean(turnstileSiteKey);

export default function PhotoColorizePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "白黒写真を無料でカラー化" },
          ]}
        />

        <div className="inner-hero">
          <p className="inner-hero-area">無料ツール・AI画像処理</p>
          <h1>古い白黒写真を無料でカラー化</h1>
          <p className="inner-hero-lead">
            白黒写真をアップロードすると、AIが自然な色を推定してカラー化する無料ツールです。色は推定であり、当時の実際の色を正確に復元するものではありません。奄美発のSHIMA
            CRAFTが提供するブラウザツールです。
          </p>
        </div>

        <section className="svc-section">
          <div className="container colorize-tool-container">
            <PhotoColorizeClient turnstileSiteKey={turnstileSiteKey} toolEnabled={toolEnabled} />
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">対応できる写真</h2>
            <ul className="svc-list">
              {SUITABLE_PHOTOS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">きれいに仕上げるコツ</h2>
            <ul className="svc-list">
              {TIPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">注意事項</h2>
            <ul className="svc-list">
              {NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">よくある質問</h2>
            <div className="svc-faq-list">
              {FAQS.map((f) => (
                <div key={f.q}>
                  <p className="svc-faq-q">{f.q}</p>
                  <p className="svc-faq-a">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="page-cta-block">
          <h2>ホームページ制作もあわせてご相談ください</h2>
          <p>
            古い写真の整理やデジタル活用のほか、ホームページ制作・リニューアルについてもご相談いただけます。
          </p>
          <div className="page-cta-btns">
            <TrackedLink
              href={mailtoHref}
              className="btn"
              eventName="contact_click"
              eventParams={{ location: "photo_colorize_cta", method: "email" }}
            >
              SHIMA CRAFTに相談する
            </TrackedLink>
            <TrackedLink
              href="/services"
              className="btn btn-ghost"
              eventName="services_click"
              eventParams={{ location: "photo_colorize_cta" }}
            >
              サービス一覧を見る
            </TrackedLink>
          </div>
        </div>

        <div className="related-section">
          <p className="related-section-label">Related</p>
          <div className="related-links">
            <Link href="/services" className="related-link">
              サービス一覧
            </Link>
            <Link href="/privacy" className="related-link">
              プライバシーポリシー
            </Link>
            <Link href="/" className="related-link">
              SHIMA CRAFT トップへ
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
