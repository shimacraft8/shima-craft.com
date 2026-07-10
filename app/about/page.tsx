import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/app/components/Footer";
import { HeaderInner } from "@/app/components/HeaderInner";
import { StickyContact } from "@/app/components/StickyContact";

import styles from "@/app/blog/blog.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "SHIMA CRAFTは、奄美大島在住のエンジニアが運営するWeb制作・業務整理・写真・ドローン空撮のサービスです。",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About｜SHIMA CRAFT",
    description:
      "奄美大島を拠点に、小さな事業のホームページ・Web集客・予約や顧客管理・写真や空撮を支援しています。",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      <HeaderInner />
      <main className={styles.pageMain}>
        <section className={styles.pageHero}>
          <div className={styles.containerNarrow}>
            <p className={styles.eyebrow}>About</p>
            <h1 className={styles.pageTitle}>SHIMA CRAFTについて</h1>
            <p className={styles.pageDescription}>
              島に根を張りながら、事業に必要なWebと仕組みを、分かりやすい形に整えます。
            </p>
          </div>
        </section>

        <section className={styles.aboutSection}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutLogo}>
              <Image src="/logo.png" alt="SHIMA CRAFT" width={300} height={68} priority />
            </div>
            <div className={styles.aboutCopy}>
              <h2>奄美大島在住のエンジニアが運営しています</h2>
              <p>
                SHIMA CRAFTは、奄美大島を拠点に、ホームページ制作・Web集客の導線整理・予約や顧客管理の業務画面・写真やドローン空撮を行っています。
              </p>
              <p>
                小さな事業では、Web担当者を専任で置くことが難しく、予約や問い合わせが電話・紙・LINE・複数のサービスに分かれがちです。私は、いきなり大きな仕組みを勧めるのではなく、今どこで困っているのかを確認し、必要な範囲から整えることを大切にしています。
              </p>
              <p>
                顔写真や実名は掲載していませんが、記事では実際に試したことや、島の事業者の方から受けた質問を、個人や店舗が特定されない形で丁寧に残していきます。
              </p>

              <div className={styles.aboutServices}>
                <h3>対応していること</h3>
                <ul>
                  <li>ホームページ制作・リニューアル</li>
                  <li>Web集客・問い合わせまでの流れの整理</li>
                  <li>予約・顧客管理などの業務画面</li>
                  <li>写真・動画・ドローン空撮</li>
                </ul>
              </div>

              <div className={styles.aboutActions}>
                <Link href="/blog" className={styles.secondaryButton}>
                  ブログを読む
                </Link>
                <Link href="/#contact" className={styles.primaryButton}>
                  相談する
                </Link>
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
