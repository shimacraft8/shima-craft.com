import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref, site } from "@/app/lib/site";
import { getViewer } from "@/lib/auth/access";
import { TRIAL_COOKIE_NAME, getTrialQuota, hashIdentity, ipHashFromHeaders, trialCookieLimit } from "@/lib/trial/trial";
import { signOutAction } from "@/app/login/actions";
import { PhotoColorizeClient, type ColorizeAccessMode } from "./PhotoColorizeClient";

const PAGE_TITLE = "白黒写真をカラー化｜古写真をAI着色サービス - SHIMA CRAFT";
const PAGE_DESC =
  "古い白黒写真を、AIが端末内（ブラウザの中）で自然な色を推定してカラー化する会員制サービス。写真は外部へ送信されません。未会員の方も3回まで無料でお試しいただけます。奄美発のSHIMA CRAFTが提供します。";

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
  "会員の方の利用状況（日時・成功/失敗・画像の縦横サイズ・処理方式など）は、サービス運営のため記録します。画像そのものは記録しません。",
];

const FAQS = [
  {
    q: "利用料金はいくらですか？",
    a: "ご利用料金・利用回数・契約条件は、ご利用内容に応じて個別にご案内します。SHIMA CRAFTへお問い合わせください。未会員の方も、お試しとして3回まで無料でカラー化をご利用いただけます（成功した生成のみカウントされます）。",
  },
  {
    q: "写真はどこかへ送信・保存されますか？",
    a: "いいえ。写真は端末内（お使いのブラウザの中）だけで処理され、SHIMA CRAFTのサーバーや外部のAIサービスへは送信されません。そのため、SHIMA CRAFTが写真を保存したり、AI学習・広告へ利用したりすることもありません。結果画像は画面上で保存でき、保存しない場合はページを離れると再表示できません。",
  },
  {
    q: "元の色を再現できますか？",
    a: "いいえ、正確な復元ではありません。AIが写真の濃淡から自然に見える色を推定して着色しており、当時の実際の色と一致することを保証するものではありません。仕上がりは「あざやか」「ひかえめ」の2種類から選べます。",
  },
  {
    q: "スマホで撮影した古写真でも使えますか？",
    a: "はい、ご利用いただけます。アルバムの写真をスマートフォンのカメラで撮影・スキャンした画像でもカラー化できます。初回はカラー化モデルのダウンロードに時間がかかるため、Wi-Fi環境でのご利用をおすすめします。",
  },
  {
    q: "顔や傷も修復されますか？",
    a: "いいえ、顔の欠損修復や傷・破損箇所の修復は行いません。本サービスは元の写真の明るさ・輪郭をそのまま保ち、色だけを推定して重ねる方式のため、人物や構図が変わることはありません。",
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
          name: "白黒写真カラー化サービス",
          item: `${site.url}/tools/photo-colorize`,
        },
      ],
    },
    {
      "@type": "WebApplication",
      name: "白黒写真カラー化サービス",
      url: `${site.url}/tools/photo-colorize`,
      applicationCategory: "PhotographyApplication",
      operatingSystem: "Any (Webブラウザ)",
      description: PAGE_DESC,
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

const BLOCKED_MESSAGE =
  "現在、このアカウントではカラー化サービスをご利用いただけません。契約状況についてSHIMA CRAFTへお問い合わせください。";

export default async function PhotoColorizePage() {
  // COLORIZE_ENABLED=false が緊急停止スイッチ（このページは動的レンダリングのため即時反映）
  const toolEnabled = process.env.COLORIZE_ENABLED !== "false";

  const viewer = await getViewer();

  let accessMode: ColorizeAccessMode;
  let trialRemaining = 0;
  const trialLimit = trialCookieLimit();

  if (viewer.kind === "anonymous") {
    accessMode = "trial";
    try {
      const cookieValue = cookies().get(TRIAL_COOKIE_NAME)?.value;
      const ipHash = ipHashFromHeaders(headers());
      // Cookie未発行の閲覧者はIP側のカウントだけで残回数を見積もる
      const cookieHash = hashIdentity(cookieValue ?? `nocookie:${ipHash}`);
      const quota = await getTrialQuota(cookieHash, ipHash);
      trialRemaining = quota.remaining;
    } catch {
      // 残回数が取得できなくても表示は継続（開始時にサーバーが最終判定する）
      trialRemaining = trialLimit;
    }
  } else if (viewer.canColorize) {
    accessMode = "member";
  } else {
    accessMode = "blocked";
  }

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
            { label: "白黒写真カラー化サービス" },
          ]}
        />

        <div className="inner-hero">
          <p className="inner-hero-area">会員サービス・AI画像処理</p>
          <h1>古い白黒写真をカラー化</h1>
          <p className="inner-hero-lead">
            白黒写真を選ぶと、AIが自然な色を推定してカラー化する会員制サービスです。処理はすべてお使いの端末内（ブラウザの中）で行われ、写真は外部へ送信されません。色は推定であり、当時の実際の色を正確に復元するものではありません。奄美発のSHIMA
            CRAFTが提供しています。未会員の方も3回まで無料でお試しいただけます。
          </p>
        </div>

        <section className="svc-section">
          <div className="container colorize-tool-container">
            {viewer.kind !== "anonymous" && (
              <div className="colorize-account-bar">
                <span>
                  ログイン中：{viewer.profile.display_name || viewer.profile.email}
                  {viewer.kind === "admin" && (
                    <>
                      {" "}
                      / <Link href="/admin">管理画面</Link>
                    </>
                  )}
                </span>
                <form action={signOutAction}>
                  <button type="submit" className="colorize-logout-btn">
                    ログアウト
                  </button>
                </form>
              </div>
            )}
            <PhotoColorizeClient
              toolEnabled={toolEnabled}
              accessMode={accessMode}
              trialRemaining={trialRemaining}
              trialLimit={trialLimit}
              blockedMessage={BLOCKED_MESSAGE}
              contactHref={mailtoHref}
            />
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">ご利用料金</h2>
            <p className="svc-lead">
              ご利用料金・利用回数・契約条件は、ご利用内容に応じて個別にご案内します。まずはお気軽にお問い合わせください。
            </p>
            <TrackedLink
              href={mailtoHref}
              className="btn"
              eventName="contact_click"
              eventParams={{ location: "photo_colorize_pricing", method: "email" }}
            >
              利用料金について問い合わせる
            </TrackedLink>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">対応できる写真</h2>
            <ul className="svc-list">
              {SUITABLE_PHOTOS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
          <div className="container">
            <h2 className="svc-title">きれいに仕上げるコツ</h2>
            <ul className="svc-list">
              {TIPS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section">
          <div className="container">
            <h2 className="svc-title">注意事項</h2>
            <ul className="svc-list">
              {NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section" style={{ background: "#fff" }}>
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
