import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref } from "@/app/lib/site";

const PAGE_TITLE = "観光・アクティビティ事業者向けホームページ制作｜SHIMA CRAFT";
const PAGE_DESC =
  "体験プラン・料金・集合場所・持ち物・注意事項・予約導線を整理した観光・アクティビティ事業者向けのホームページ制作。奄美発・全国オンライン対応。";

export const metadata: Metadata = {
  title: "観光・アクティビティ事業者向けホームページ制作",
  description: PAGE_DESC,
  alternates: { canonical: "/industry/tourism" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: "/industry/tourism",
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESC,
    images: ["/hero.jpg"],
  },
};

const CONCERNS = [
  "料金やプランの情報がInstagramに散らばっていて、まとまったページがない",
  "予約前に同じ質問を繰り返し受けている（集合場所・持ち物・キャンセルポリシーなど）",
  "予約サイトに登録しているが、自分のページがほしい",
  "シーズンや天候によってプランが変わるが、それをうまく伝えられていない",
  "写真はあるが、お客様に体験の魅力が伝わる形になっていない",
  "口コミや過去の実績を整理して見せたい",
];

const CONTENTS = [
  {
    title: "体験プランの整理",
    desc: "体験内容、所要時間、対象年齢・対象人数、開催時間などをページでまとめます。",
  },
  {
    title: "料金・プランの明示",
    desc: "大人・子ども・グループなど、分かりやすい料金表示にします。",
  },
  {
    title: "集合場所・アクセス",
    desc: "地図やルートの案内など、初めての方でも迷わない情報を整理します。",
  },
  {
    title: "持ち物・服装・注意事項",
    desc: "よくある質問への回答をページに載せ、問い合わせの手間を減らします。",
  },
  {
    title: "予約・問い合わせ導線",
    desc: "既存の予約サービスへの案内や、メールでの問い合わせ先を設置します。",
  },
  {
    title: "写真・動画の活用",
    desc: "撮影済みの素材を整理して掲載します。撮影サポートのご相談も可能です。",
  },
];

const FLOW_STEPS = [
  {
    num: "01",
    title: "状況の確認",
    desc: "提供しているプランや現在の情報発信方法、困りごとをメールでお聞きします。",
  },
  {
    num: "02",
    title: "掲載内容の整理",
    desc: "ページに必要な情報を一緒に整理します。既存の素材があればご共有ください。",
  },
  {
    num: "03",
    title: "構成の確認",
    desc: "ページの構成イメージをお見せしながら、方向性を確認します。",
  },
  {
    num: "04",
    title: "制作・公開",
    desc: "内容が揃ったところで制作を進め、確認・修正を経て公開します。",
  },
];

const FAQS = [
  {
    q: "予約サイトに登録済みでも依頼できますか？",
    a: "はい、対応できます。じゃらんや楽天トラベルなどの予約サイトと併用しているケースも多く、自社ページからそれらへ誘導する形にも対応しています。",
  },
  {
    q: "プランが複数あっても対応できますか？",
    a: "はい、複数プランの掲載に対応しています。プランごとに料金・内容・注意事項をまとめる形でご提案します。",
  },
  {
    q: "奄美大島以外の事業者でも依頼できますか？",
    a: "はい、全国どこからでもご依頼いただけます。打ち合わせはメールで進めます。写真・動画撮影が必要な場合は、撮影エリアを別途ご確認ください。",
  },
  {
    q: "季節限定のプランがありますが、どう対応しますか？",
    a: "シーズン情報や開催時期をページに明記する形で対応できます。プランが増えた場合の追加掲載についてはご相談ください。",
  },
];

export default function TourismPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "サービス", href: "/services" },
            { label: "観光・アクティビティ事業者向け" },
          ]}
        />

        <div className="inner-hero">
          <p className="inner-hero-area">INDUSTRY / TOURISM</p>
          <h1>観光・アクティビティ事業者向けホームページ制作</h1>
          <p className="inner-hero-lead">
            体験プランや料金、集合場所、注意事項など、予約前に必要な情報を整理してまとめます。問い合わせの手間を減らしながら、体験の魅力を伝えるページを制作します。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">こんな状況の方へ</h2>
            <ul className="svc-list">
              {CONCERNS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">掲載できる内容</h2>
            <div className="svc-cards">
              {CONTENTS.map((c) => (
                <article className="svc-card" key={c.title}>
                  <h3>{c.title}</h3>
                  <p className="svc-card-desc">{c.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">制作の流れ</h2>
            <div className="svc-flow">
              {FLOW_STEPS.map((s) => (
                <div key={s.num} className="svc-flow-step">
                  <span className="svc-flow-num">{s.num}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">料金の目安</h2>
            <div className="price-card-simple">
              <div>
                <p className="price-card-label">ホームページ制作</p>
                <p className="price-card-price">150,000円〜</p>
                <p className="price-card-note">初回ドメイン代・1年間の保守込み</p>
              </div>
              <div>
                <p className="price-card-label">写真撮影セット</p>
                <p className="price-card-price">180,000円〜</p>
                <p className="price-card-note">撮影対応エリアにより異なります</p>
              </div>
              <div>
                <p className="price-card-label">空撮・写真セット</p>
                <p className="price-card-price">200,000円〜</p>
                <p className="price-card-note">撮影内容により変わります</p>
              </div>
            </div>
            <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#777" }}>
              ※ 内容によって変わりますので、まずは現状をお聞かせください。
            </p>
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
          <h2>まずはご相談ください</h2>
          <p>
            提供しているプランや現在の情報発信の状況をお聞かせください。必要な内容を整理しながら対応をご提案します。
          </p>
          <div className="page-cta-btns">
            <TrackedLink
              href={mailtoHref}
              className="btn"
              eventName="contact_click"
              eventParams={{ location: "tourism_cta", method: "email" }}
            >
              ホームページについて相談する
            </TrackedLink>
          </div>
        </div>

        <div className="related-section">
          <p className="related-section-label">Related</p>
          <div className="related-links">
            <Link href="/services" className="related-link">
              サービス一覧を見る
            </Link>
            <Link href="/service/web-design" className="related-link">
              ホームページ制作・リニューアル
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
