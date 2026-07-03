import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderInner } from "@/app/components/HeaderInner";
import { requireAdmin, AdminRequiredError } from "@/lib/auth/access";
import { signOutAction } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "管理画面 - SHIMA CRAFT",
  robots: { index: false, follow: false },
};

/**
 * /admin 配下の共通レイアウト。
 * サーバー側で admin 判定を行い、admin以外には404を返す
 * （管理画面の存在自体を一般ユーザーへ露出しない。middlewareの
 * セッション確認・各Server ActionのrequireAdmin・RLSと多層で防御）。
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let adminEmail = "";
  try {
    const profile = await requireAdmin();
    adminEmail = profile.email;
  } catch (err) {
    if (err instanceof AdminRequiredError) notFound();
    throw err;
  }

  return (
    <>
      <HeaderInner />
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="管理メニュー">
          <p className="admin-nav-title">管理画面</p>
          <Link href="/admin">ダッシュボード</Link>
          <Link href="/admin/users">ユーザー管理</Link>
          <Link href="/admin/invitations">招待</Link>
          <Link href="/admin/logs">利用ログ</Link>
          <Link href="/admin/audit-logs">監査ログ</Link>
          <Link href="/tools/photo-colorize">カラー化ツールへ</Link>
        </nav>
        <main className="admin-main">
          <div className="colorize-account-bar">
            <span>管理者: {adminEmail}</span>
            <form action={signOutAction}>
              <button type="submit" className="colorize-logout-btn">
                ログアウト
              </button>
            </form>
          </div>
          {children}
        </main>
      </div>
    </>
  );
}
