import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { EmailCopyButton } from "@/app/components/EmailCopyButton";
import { Footer } from "@/app/components/Footer";
import { HeaderInner } from "@/app/components/HeaderInner";
import { StickyContact } from "@/app/components/StickyContact";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref, site } from "@/app/lib/site";

import styles from "@/app/blog/blog.module.css";

export const metadata: Metadata = {
  title: "SHIMA CRAFTについて｜奄美大島のWeb・写真の作り手",
  description:
    "奄美大島を拠点に、ホームページ制作、Web集客、業務を整える仕組み、写真・動画・ドローン空撮を行うSHIMA CRAFTの運営者紹介です。",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "SHIMA CRAFTについて｜奄美大島のWeb・写真の作り手",
    description:
      "奄美大島を拠点に、ホームページ制作、Web集客、業務を整える仕組み、写真・動画・ドローン空撮を行うSHIMA CRAFTの運営者紹介です。",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      <HeaderInner />
      <main className={styles.pageMain}>
        {/* ===== ファーストビュー ===== */}
        <section className={styles.pageHero}>
          <div className={styles.containerNarrow}>
            <p className={styles.eyebrow}>About</p>
            <div className={styles.aboutHeroInner}>
              <div className={styles.aboutAvatarCol}>
                <div className={styles.aboutAvatarCircleWrap}>
                  <Image
                    src="/images/profile/shima-craft-avatar.png"
                    alt="SHIMA CRAFTを運営する島の作り手のアバター"
                    width={320}
                    height={320}
                    className={styles.aboutAvatarImg}
                    priority
                  />
                </div>
              </div>
              <div className={styles.aboutTextCol}>
                <h1 className={styles.aboutHeroHeading}>
                  島で暮らしながら、<br />
                  Webと写真をつくっています。
                </h1>
                <p className={styles.aboutHeroSub}>SHIMA CRAFT｜島の作り手</p>
                <p className={styles.pageDescription}>
                  SHIMA CRAFTは、奄美大島を拠点に、ホームページや業務を少し整える仕組み、写真・映像をつくっています。
                  <br />
                  派手な営業よりも、必要になったときに見つけてもらえるものを、ひとつずつ丁寧に置いていくことを大切にしています。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 本文セクション群 ===== */}
        <section className={styles.aboutSection}>
          <div className={styles.aboutSingleCol}>

            {/* Section 1: SHIMA CRAFTについて */}
            <div className={styles.aboutBlock}>
              <p className={styles.eyebrow}>About</p>
              <h2 className={styles.aboutBlockTitle}>島の小さな事業に、ちょうどいい仕組みを。</h2>
              <p className={styles.aboutBlockText}>
                地方や離島の小さな事業では、ホームページ、予約、顧客情報、SNS、電話やLINEなどが別々になり、日々の作業が少しずつ複雑になることがあります。
              </p>
              <p className={styles.aboutBlockText}>
                SHIMA CRAFTでは、難しい仕組みを増やすのではなく、その事業に本当に必要なものを整理し、無理なく使い続けられる形にすることを大切にしています。
              </p>
            </div>

            {/* Section 2: できること */}
            <div className={styles.aboutBlock}>
              <p className={styles.eyebrow}>Services</p>
              <h2 className={styles.aboutBlockTitle}>できること</h2>
              <ul className={styles.aboutServiceList}>
                <li>ホームページ制作・リニューアル</li>
                <li>Web集客と問い合わせ導線の整理</li>
                <li>予約・顧客管理などの業務画面</li>
                <li>写真・動画・ドローン空撮</li>
              </ul>
            </div>

            {/* Section 3: 大切にしていること */}
            <div className={styles.aboutBlock}>
              <p className={styles.eyebrow}>Values</p>
              <h2 className={styles.aboutBlockTitle}>大切にしていること</h2>
              <div className={styles.valuesGrid}>
                <div className={styles.valueCard}>
                  <h3>分かりやすくする</h3>
                  <p>難しいことを難しいまま残さず、整理して伝える。</p>
                </div>
                <div className={styles.valueCard}>
                  <h3>必要以上に複雑にしない</h3>
                  <p>本当に必要なものだけを、シンプルに。大きな仕組みを押し付けない。</p>
                </div>
                <div className={styles.valueCard}>
                  <h3>作った後も使い続けられる形にする</h3>
                  <p>納品して終わりではなく、実際に続けて使えるものを一緒に考える。</p>
                </div>
              </div>
            </div>

            {/* Section 4: ブログについて */}
            <div className={styles.aboutBlock}>
              <p className={styles.eyebrow}>Blog</p>
              <h2 className={styles.aboutBlockTitle}>ブログについて</h2>
              <p className={styles.aboutBlockText}>
                このブログでは、地方・離島の小さな宿や店舗、観光事業者の方に向けて、予約管理、集客、口コミ、写真・空撮について発信しています。
              </p>
              <p className={styles.aboutBlockText}>
                専門用語を並べるのではなく、実際に何から始めればよいかが分かる記事を目指しています。
              </p>
              <Link href="/blog" className={styles.secondaryButton}>
                ブログの記事を見る
              </Link>
            </div>

            {/* 問い合わせ導線 */}
            <div className={styles.aboutContactBlock}>
              <p className={styles.aboutContactText}>
                Webや写真のことを少し整理したいときは、SHIMA CRAFTへご相談ください。
              </p>
              <div className={styles.aboutContactActions}>
                <TrackedLink
                  href={mailtoHref}
                  className={styles.primaryButton}
                  eventName="contact_click"
                  eventParams={{ location: "about", method: "email" }}
                >
                  メールで相談する
                </TrackedLink>
                <div className={styles.aboutEmailWrap}>
                  <span className={styles.aboutEmailText}>{site.email}</span>
                  <EmailCopyButton />
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}
