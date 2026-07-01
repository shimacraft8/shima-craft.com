import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref } from "@/app/lib/site";

const PAGE_TITLE = "サービス一覧｜SHIMA CRAFT";
const PAGE_DESC =
  "ホームページ制作・リニューアル、写真・動画、予約・問い合わせ管理など、SHIMA CRAFTが対応するサービスをご案内します。奄美発・全国オンライン対応。";

export const metadata: Metadata = {
  title: "サービス一覧",
  description: PAGE_DESC,
  alternates: { canonical: "/services" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: "/services",
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

const SERVICES = [
  {
    title: "ホームページ制作・リニューアル",
    concern:
      "サイトが古い、スマートフォンで見づらい、事業内容や魅力が伝わりにくい方向け。",
    desc: "掲載情報の整理から、デザイン、スマートフォン対応、問い合わせ導線の設置、公開作業まで対応します。",
    href: "/service/web-design",
    cta: "ホームページ制作の詳細を見る",
    eventName: "web_design_page_click",
  },
  {
    title: "観光・アクティビティ事業者向けホームページ制作",
    concern:
      "料金やプランがInstagramに埋もれている、予約前の疑問に繰り返し対応している方向け。",
    desc: "体験プラン、料金、集合場所、持ち物、注意事項、予約・問い合わせ先を整理したページ制作ができます。",
    href: "/industry/tourism",
    cta: "観光事業者向けページを見る",
    eventName: "tourism_page_click",
  },
  {
    title: "写真・動画・ドローン撮影",
    concern: "事業の雰囲気や魅力を、写真や動画でうまく伝えたい方向け。",
    desc: "WebサイトやSNSで使いやすい写真・動画・空撮素材の準備をご相談いただけます。",
    href: mailtoHref,
    cta: "撮影について相談する",
    eventName: "contact_click",
  },
  {
    title: "予約・問い合わせ・顧客管理",
    concern:
      "予約や顧客情報を、電話・紙・複数ツールで管理している方向け。",
    desc: "業務システム画面サンプルを見ながら、管理画面の導入を検討いただけます。",
    href: "/system-samples",
    cta: "業務システムのサンプルを見る",
    eventName: "sample_click",
  },
  {
    title: "Web上の情報・導線の整理",
    concern:
      "Googleマップや予約サイトの情報が古い、問い合わせまでの流れが分かりにくい方向け。",
    desc: "Googleマップ、予約サイト、SNSとホームページのつながりを確認し、整理をサポートします。",
    href: mailtoHref,
    cta: "現状を相談する",
    eventName: "contact_click",
  },
] as const;

export default function ServicesPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "サービス" },
          ]}
        />

        <div className="inner-hero">
          <p className="inner-hero-area">SERVICES</p>
          <h1>SHIMA CRAFTのサービス</h1>
          <p className="inner-hero-lead">
            ホームページ制作を中心に、写真・動画、予約や問い合わせの仕組みづくりまで、事業の状況に合わせて必要な内容を整理します。
          </p>
        </div>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">ご提供内容</h2>
            <div className="svc-cards">
              {SERVICES.map((s) => (
                <article className="svc-card" key={s.title}>
                  <h3>{s.title}</h3>
                  <p className="svc-card-concern">{s.concern}</p>
                  <p className="svc-card-desc">{s.desc}</p>
                  <TrackedLink
                    href={s.href}
                    className="text-link"
                    eventName={s.eventName}
                    eventParams={{ location: "services_page", service: s.title }}
                  >
                    {s.cta}
                  </TrackedLink>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="page-cta-block">
          <h2>まずはご相談ください</h2>
          <p>
            依頼内容が決まっていなくて大丈夫です。現在の状況や気になっていることをメールでお聞かせください。
          </p>
          <div className="page-cta-btns">
            <TrackedLink
              href={mailtoHref}
              className="btn"
              eventName="contact_click"
              eventParams={{ location: "services_cta", method: "email" }}
            >
              ホームページについて相談する
            </TrackedLink>
          </div>
        </div>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            <Link href="/web-check" className="related-link">
              Web導線かんたんチェック
            </Link>
            <Link href="/tools/photo-colorize" className="related-link">
              白黒写真を無料でカラー化
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
