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
  "白黒写真を選ぶと、AIが端末内（ブラウザの中）で自然な色を推定して無料でカラー化。写真は外部へ送信されません。スマホで撮影した古写真にも対応。奄美発のSHIMA CRAFTが提供するブラウザツールです。";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
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
  "この写真は端末内（お使いのブラウザの中）で処理されます。写真はSHIMA CRAFTや外部AIサービスへ送信されません。",
  "写真が外部へ送信されないため、SHIMA CRAFTが利用者の画像をAI学習・広告・制作事例へ利用することもありません。",
  "結果の色はAIによる推定です。当時の実際の色を正確に復元・保証するものではありません。",
  "人物の輪郭や構図を新しく生成する機能ではないため、顔や傷、破損箇所の修復・復元は行いません。",
  "初回はカラー化モデル（約44〜69MB）の読み込みに時間がかかる場合があります。2回目以降はブラウザのキャッシュにより速くなります。",
  "自分が権利を持つ画像のみご利用ください。",
  "本ツールは現在試験提供中です。利用条件は今後変更する場合があります。",
];

const FAQS = [
  {
    q: "本当に無料ですか？",
    a: "はい、無料でご利用いただけます。カラー化はお使いの端末のブラウザ内で行われるため、回数の上限もありません。なお本ツールは試験提供中のため、利用条件は今後変更する場合があります。",
  },
  {
    q: "写真はどこかへ送信・保存されますか？",
    a: "いいえ。写真は端末内（お使いのブラウザの中）だけで処理され、SHIMA CRAFTのサーバーや外部のAIサービスへは送信されません。そのため、SHIMA CRAFTが写真を保存したり、AI学習・広告へ利用したりすることもありません。結果画像は画面上で保存でき、保存しない場合はページを離れると再表示できません。",
  },
  {
    q: "元の色を再現できますか？",
    a: "いいえ、正確な復元ではありません。AIが写真の濃淡から自然に見える色を推定して着色しており、当時の実際の色と一致することを保証するものではありません。",
  },
  {
    q: "スマホで撮影した古写真でも使えますか？",
    a: "はい、ご利用いただけます。アルバムの写真をスマートフォンのカメラで撮影・スキャンした画像でもカラー化できます。初回はカラー化モデルのダウンロードに時間がかかるため、Wi-Fi環境でのご利用をおすすめします。",
  },
  {
    q: "顔や傷も修復されますか？",
    a: "いいえ、顔の欠損修復や傷・破損箇所の修復は行いません。本ツールは元の写真の明るさ・輪郭をそのまま保ち、色だけを推定して重ねる方式のため、人物や構図が変わることはありません。",
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

// ブラウザ内処理のためTurnstile・回数制限は不要。COLORIZE_ENABLED=false が緊急停止スイッチ。
const toolEnabled = process.env.COLORIZE_ENABLED !== "false";

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
          <p className="inner-hero-area">無料ツール・AI画像処理（試験提供中）</p>
          <h1>古い白黒写真を無料でカラー化</h1>
          <p className="inner-hero-lead">
            白黒写真を選ぶと、AIが自然な色を推定してカラー化する無料ツールです。処理はすべてお使いの端末内（ブラウザの中）で行われ、写真は外部へ送信されません。色は推定であり、当時の実際の色を正確に復元するものではありません。奄美発のSHIMA
            CRAFTが提供するブラウザツールです。
          </p>
        </div>

        <section className="svc-section">
          <div className="container colorize-tool-container">
            <PhotoColorizeClient toolEnabled={toolEnabled} />
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
