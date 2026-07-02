import type { Metadata } from "next";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "パスワード再設定｜白黒写真カラー化サービス",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <HeaderInner />
      <main>
        <div className="inner-hero">
          <p className="inner-hero-area">会員サービス</p>
          <h1>パスワードの再設定</h1>
          <p className="inner-hero-lead">
            登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
          </p>
        </div>
        <section className="svc-section">
          <div className="container auth-container">
            <ForgotPasswordForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
