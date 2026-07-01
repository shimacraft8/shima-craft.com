import Link from "next/link";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { StickyContact } from "@/app/components/StickyContact";

export default function NotFound() {
  return (
    <>
      <HeaderInner />
      <main>
        <section className="not-found-section">
          <p className="inner-hero-area">404</p>
          <h1>ページが見つかりません</h1>
          <p>
            URLが変更されたか、ページが公開されていない可能性があります。
          </p>
          <div className="page-cta-btns">
            <Link className="btn btn-soft" href="/">
              トップへ戻る
            </Link>
            <Link className="btn btn-ghost" href="/amami-dialect">
              奄美方言辞書へ
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <StickyContact />
    </>
  );
}

