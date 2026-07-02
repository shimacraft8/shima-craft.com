import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { Footer } from "@/app/components/Footer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "新しいパスワードの設定｜白黒写真カラー化サービス",
  robots: { index: false },
};

export default async function ResetPasswordPage() {
  // 再設定・招待リンク経由のセッションがない場合はログインへ
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link");

  return (
    <>
      <HeaderInner />
      <main>
        <div className="inner-hero">
          <p className="inner-hero-area">会員サービス</p>
          <h1>新しいパスワードの設定</h1>
          <p className="inner-hero-lead">新しいパスワードを設定してください（10文字以上）。</p>
        </div>
        <section className="svc-section">
          <div className="container auth-container">
            <ResetPasswordForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
