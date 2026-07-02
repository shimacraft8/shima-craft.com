import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { EditUserForm } from "./EditUserForm";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();

  const supabase = createSupabaseServerClient();
  const [{ data: profile }, { data: lastLog }, { data: currentUser }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).maybeSingle<Profile>(),
    supabase
      .from("colorization_logs")
      .select("created_at")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>(),
    supabase.auth.getUser().then((r) => ({ data: r.data.user })),
  ]);

  if (!profile) notFound();

  return (
    <>
      <p style={{ marginBottom: 10, fontSize: "0.85rem" }}>
        <Link href="/admin/users">← ユーザー一覧へ戻る</Link>
      </p>
      <h1 className="admin-page-title">ユーザー詳細・編集</h1>
      <div className="admin-cards">
        <div className="admin-card">
          <p className="admin-card-label">作成日</p>
          <p style={{ fontSize: "0.95rem", marginTop: 4 }}>
            {new Date(profile.created_at).toLocaleString("ja-JP")}
          </p>
        </div>
        <div className="admin-card">
          <p className="admin-card-label">最終ログイン</p>
          <p style={{ fontSize: "0.95rem", marginTop: 4 }}>
            {profile.last_login_at ? new Date(profile.last_login_at).toLocaleString("ja-JP") : "-"}
          </p>
        </div>
        <div className="admin-card">
          <p className="admin-card-label">最終利用日時</p>
          <p style={{ fontSize: "0.95rem", marginTop: 4 }}>
            {lastLog ? new Date(lastLog.created_at).toLocaleString("ja-JP") : "-"}
          </p>
        </div>
      </div>
      <EditUserForm profile={profile} isSelf={currentUser?.id === profile.id} />
      <p style={{ marginTop: 12, fontSize: "0.85rem" }}>
        <Link href={`/admin/logs?user=${encodeURIComponent(profile.email)}`}>
          このユーザーの利用ログを見る →
        </Link>
      </p>
    </>
  );
}
