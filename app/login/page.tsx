import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref } from "@/app/lib/site";
import { getViewer } from "@/lib/auth/access";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "ログイン｜白黒写真カラー化サービス",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = sanitizeNextPath(searchParams.next);

  const viewer = await getViewer();
  if (viewer.kind !== "anonymous" && viewer.profile.account_status === "active") {
    redirect(next);
  }

  return (
    <>
      <HeaderInner />
      <main>
        <div className="inner-hero">
          <p className="inner-hero-area">会員サービス</p>
          <h1>白黒写真カラー化サービスにログイン</h1>
          <p className="inner-hero-lead">
            本サービスのご利用には、SHIMA CRAFTが発行したアカウントが必要です。
          </p>
        </div>

        <section className="svc-section">
          <div className="container auth-container">
            {searchParams.error === "link" && (
              <p className="auth-error" role="alert">
                リンクが無効または期限切れです。もう一度お試しください。
              </p>
            )}
            <LoginForm next={next} />

            <div className="auth-aside">
              <h2 className="auth-aside-title">アカウントをお持ちでない方へ</h2>
              <p>
                アカウントをお持ちでない方、利用料金についてはお問い合わせください。ご利用料金・利用回数・契約条件は、ご利用内容に応じて個別にご案内します。
              </p>
              <div className="auth-aside-actions">
                <TrackedLink
                  href={mailtoHref}
                  className="btn"
                  eventName="contact_click"
                  eventParams={{ location: "login_page", method: "email" }}
                >
                  利用について問い合わせる
                </TrackedLink>
              </div>
              <p className="auth-trial-note">
                未会員でお試しを実施したい方は、
                <Link href="/tools/photo-colorize">カラー化ページのお試し利用（3回まで）</Link>
                をご利用いただけます。
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
