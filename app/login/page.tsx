import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { TrackedLink } from "@/app/components/TrackedLink";
import { mailtoHref } from "@/app/lib/site";
import { getViewer } from "@/lib/auth/access";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { GoogleLoginButton } from "./GoogleLoginButton";

export const metadata: Metadata = {
  title: "ログイン｜白黒写真カラー化サービス",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; invite?: string };
}) {
  const next = sanitizeNextPath(searchParams.next);
  const invite = typeof searchParams.invite === "string" ? searchParams.invite : undefined;

  const viewer = await getViewer();
  if (viewer.kind !== "anonymous") {
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
            {invite
              ? "ご招待いただいたGoogleアカウントでログインするとご利用を開始できます。"
              : "招待を受けたGoogleアカウントでログインしてください。"}
          </p>
        </div>

        <section className="svc-section">
          <div className="container auth-container">
            <div className="auth-form">
              <GoogleLoginButton next={next} invitationToken={invite} />
              <p className="auth-note">
                招待メールに記載のGoogleアカウントでログインしてください。招待されていないアカウントではご利用いただけません。
              </p>
            </div>

            <div className="auth-aside">
              <h2 className="auth-aside-title">アカウントをお持ちでない方へ</h2>
              <p>
                ご利用料金・利用回数・契約条件は、ご利用内容に応じて個別にご案内します。まずはお気軽にお問い合わせください。
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
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
