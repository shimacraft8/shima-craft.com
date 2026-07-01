import type { Metadata } from "next";
import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import { AMAMI_DIALECT_PATH } from "@/app/lib/amamiDialect";

const PAGE_DESC =
  "SHIMA CRAFTの奄美方言辞書における掲載方針、出典の扱い、地域差・表記差の考え方、AIの利用範囲をまとめています。";

export const metadata: Metadata = {
  title: "奄美方言辞書の掲載方針",
  description: PAGE_DESC,
  alternates: { canonical: `${AMAMI_DIALECT_PATH}/about` },
  openGraph: {
    title: "奄美方言辞書の掲載方針｜SHIMA CRAFT",
    description: PAGE_DESC,
    url: `${AMAMI_DIALECT_PATH}/about`,
    type: "website",
    locale: "ja_JP",
    siteName: "SHIMA CRAFT",
    images: [{ url: "/hero.jpg", width: 1200, height: 630, alt: "奄美大島の空撮写真 — SHIMA CRAFT" }],
  },
};

export default function AmamiDialectAboutPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <Breadcrumb
          items={[
            { label: "トップ", href: "/" },
            { label: "奄美方言辞書", href: AMAMI_DIALECT_PATH },
            { label: "掲載方針" },
          ]}
        />

        <div className="inner-hero dialect-hero">
          <p className="inner-hero-area">ABOUT</p>
          <h1>奄美方言辞書の掲載方針</h1>
          <p className="inner-hero-lead">
            原資料で確認できた内容を中心に掲載し、確認できていない現代使用・地域差・世代差は断定しません。
          </p>
        </div>

        <section className="svc-section">
          <div className="svc-inner dialect-policy">
            <h2 className="svc-title">公開しているデータ</h2>
            <p>
              このサイトでは、原資料で確認できた内容だけを一般公開用に整理して掲載しています。
              確認の途中段階にある調査メモや、専門家・研究者向けの詳細データは公開ページには含めていません。
            </p>

            <h2 className="svc-title">表示方針</h2>
            <ul className="svc-list">
              <li>一般向けページではカタカナ読みを中心に表示します。</li>
              <li>専門的な音声・音韻表記は表示対象から外します。</li>
              <li>出典にない意味や用例は追加しません。</li>
              <li>地域差、世代差、現在の日常会話での使用状況は、未確認のまま断定しません。</li>
            </ul>

            <h2 className="svc-title">地域差・表記差の扱い</h2>
            <p>
              奄美群島の方言は、島や集落によって異なる場合があります。語彙ページでは、
              奄美大島・喜界島・徳之島・沖永良部島・与論島という資料が示す地域単位で
              記録形をそのまま並べており、似た発音の表記であっても、資料で別の記録として
              示されているものを断定的に一つの表記へ統一することはしていません。
              「集落によって異なる」という資料側の注記がある場合は、あわせて明記しています。
            </p>

            <h2 className="svc-title">出典</h2>
            <p>
              ことわざは主に「石崎公曹の奄美のことわざ」に基づく公開用データを使用しています。
              あいさつ・家族・道具・自然・生き物・食事の語彙は、鹿児島県大島支庁および
              大島地区文化協会連絡協議会による公式資料「大島地区方言マップ」に基づいています。
              個人・民間サイトの情報は、公式資料と区別したうえで、あくまで参考情報として
              扱っています。出典情報は各詳細ページの「出典情報」にまとめています。
            </p>

            <h2 className="svc-title">AIの利用について</h2>
            <p>
              本辞書の作成にあたっては、資料の文字起こし・整理・データ化の一部にAIを利用しています。
              ただし、原資料に無い意味・読み・地域情報をAIが推測で補うことはせず、
              原資料で確認できない内容は「未確認」「要確認」として区別しています。
              内容に誤りがあると思われる場合や、より確かな情報をお持ちの場合は、
              お問い合わせよりご連絡ください。
            </p>
          </div>
        </section>

        <div className="related-section">
          <p className="related-section-label">Navigation</p>
          <div className="related-links">
            <Link href={`${AMAMI_DIALECT_PATH}/proverbs`} className="related-link">
              ことわざ一覧
            </Link>
            <Link href={`${AMAMI_DIALECT_PATH}/greetings`} className="related-link">
              あいさつ一覧
            </Link>
            <Link href={`${AMAMI_DIALECT_PATH}/words`} className="related-link">
              語彙一覧
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}

