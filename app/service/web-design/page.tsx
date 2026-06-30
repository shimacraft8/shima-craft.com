import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "ホームページ制作・リニューアル",
  description:
    "奄美発・全国オンライン対応。サイトが古い・スマホ非対応・問い合わせが来ないなどのお困りごとを整理し、必要な情報を伝わる形にまとめたホームページを制作します。",
  alternates: { canonical: "/service/web-design" },
  openGraph: {
    title: "ホームページ制作・リニューアル｜SHIMA CRAFT",
    description:
      "奄美発・全国オンライン対応。サイトが古い・スマホ非対応・問い合わせが来ないなどのお困りごとを整理し、必要な情報を伝わる形にまとめたホームページを制作します。",
    url: "/service/web-design",
  },
  twitter: {
    title: "ホームページ制作・リニューアル｜SHIMA CRAFT",
    description:
      "奄美発・全国オンライン対応。サイトが古い・スマホ非対応・問い合わせが来ないなどのお困りごとを整理し、必要な情報を伝わる形にまとめたホームページを制作します。",
  },
};

const CONCERNS = [
  "サイトが古くて、スマートフォンで見づらい",
  "事業の内容や強みが、うまく伝わっていない気がする",
  "問い合わせページがあるのに、なかなか連絡が来ない",
  "Instagramに情報を流しているが、まとまったページがない",
  "業者に頼んだが、思っていたものと違った",
  "自分で作ったが、見た目や構成に自信がない",
];

const FLOW_STEPS = [
  {
    num: "01",
    title: "状況の確認",
    desc: "現在の状況や困りごと、制作の背景をメールでお聞きします。",
  },
  {
    num: "02",
    title: "内容の整理",
    desc: "必要なページや掲載内容、写真・動画の準備状況を確認します。",
  },
  {
    num: "03",
    title: "進め方の提案",
    desc: "構成や画面のイメージを共有しながら方向性を決めます。",
  },
  {
    num: "04",
    title: "制作・確認",
    desc: "公開に向けて調整を重ね、内容が揃ったところで公開します。",
  },
];

const FAQS = [
  {
    q: "依頼内容が決まっていなくても相談できますか？",
    a: "はい、大丈夫です。「サイトをどうにかしたい」「何から始めればいいか分からない」という段階からご相談いただけます。まず現状をお聞きした上で、必要な内容を一緒に整理します。",
  },
  {
    q: "全国どこからでも依頼できますか？",
    a: "はい、対応できます。打ち合わせはメールで進めますので、地域を問わずご依頼いただけます。写真・動画の撮影が必要な場合は、撮影可能な地域をご確認ください。",
  },
  {
    q: "制作期間の目安を教えてください。",
    a: "内容の確認や素材の準備状況によって変わりますが、1〜2か月を目安にお考えください。お急ぎの場合はご相談ください。",
  },
  {
    q: "写真や文章がなくても制作できますか？",
    a: "可能な範囲でサポートします。写真については撮影対応のプランもあります（対応エリアあり）。文章については内容を伺いながら整理します。",
  },
];

const SCOPE_TAGS = [
  "掲載内容の整理",
  "デザイン",
  "スマートフォン対応",
  "問い合わせ導線",
  "ドメイン・サーバー設定",
  "公開作業",
  "1年間の保守サポート",
];

export default function WebDesignPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "サービス", href: "/services" },
            { label: "ホームページ制作・リニューアル" },
          ]}
        />

        <div className="inner-hero">
          <p className="inner-hero-area">SERVICE</p>
          <h1>ホームページ制作・リニューアル</h1>
          <p className="inner-hero-lead">
            事業内容や魅力を整理し、必要な情報が伝わる形のホームページを制作します。奄美発・全国オンライン対応。
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
            <h2 className="svc-title">対応できる内容</h2>
            <p style={{ marginBottom: "1.5rem" }}>
              ホームページの新規制作・既存サイトのリニューアルに対応しています。掲載内容の整理から公開、公開後の保守まで一通り対応します。
            </p>
            <div className="svc-tags">
              {SCOPE_TAGS.map((t) => (
                <span key={t} className="svc-tag">{t}</span>
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
            <h2 className="svc-title">制作サンプル</h2>
            <p style={{ marginBottom: "1.5rem" }}>
              整体院・美容院・カフェなどの制作サンプルを公開しています。実際の画面を確認してから依頼のご相談が可能です。
            </p>
            <TrackedLink
              href="/#works"
              className="btn btn-ghost"
              eventName="works_click"
              eventParams={{ location: "web_design_page_samples" }}
            >
              制作サンプルを見る
            </TrackedLink>
          </div>
        </section>

        <section className="svc-section svc-faq" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">よくある質問</h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <p className="svc-faq-q">{f.q}</p>
                <p className="svc-faq-a">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="page-cta-block">
          <h2>ホームページについてご相談ください</h2>
          <p>
            依頼内容が決まっていなくて大丈夫です。現在の状況や気になっていることをメールでお聞かせください。
          </p>
          <div className="page-cta-btns">
            <TrackedLink
              href={mailtoHref}
              className="btn"
              eventName="contact_click"
              eventParams={{ location: "web_design_cta", method: "email" }}
            >
              ホームページについて相談する
            </TrackedLink>
            <TrackedLink
              href="/system-samples"
              className="btn btn-ghost"
              eventName="sample_click"
              eventParams={{ location: "web_design_cta" }}
            >
              業務システムのサンプルを見る
            </TrackedLink>
          </div>
        </div>

        <div className="related-section">
          <p className="related-section-label">Related</p>
          <div className="related-links">
            <Link href="/services" className="related-link">
              サービス一覧を見る
            </Link>
            <Link href="/industry/tourism" className="related-link">
              観光事業者向けページ
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
