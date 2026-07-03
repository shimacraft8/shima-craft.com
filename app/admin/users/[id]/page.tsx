import Link from "next/link";
import { notFound } from "next/navigation";
import { getMember } from "@/lib/members/repo";
import { getViewer } from "@/lib/auth/access";
import { EditMemberForm } from "./EditMemberForm";

export const dynamic = "force-dynamic";

const UID_RE = /^[A-Za-z0-9_-]{6,128}$/;

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  if (!UID_RE.test(params.id)) notFound();

  const [member, viewer] = await Promise.all([getMember(params.id), getViewer()]);
  if (!member) notFound();
  const isSelf = viewer.kind !== "anonymous" && viewer.member.uid === member.uid;

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
            {new Date(member.createdAt).toLocaleString("ja-JP")}
          </p>
        </div>
        <div className="admin-card">
          <p className="admin-card-label">最終ログイン</p>
          <p style={{ fontSize: "0.95rem", marginTop: 4 }}>
            {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString("ja-JP") : "-"}
          </p>
        </div>
        <div className="admin-card">
          <p className="admin-card-label">最終利用日時</p>
          <p style={{ fontSize: "0.95rem", marginTop: 4 }}>
            {member.lastUsedAt ? new Date(member.lastUsedAt).toLocaleString("ja-JP") : "-"}
          </p>
        </div>
      </div>
      <EditMemberForm member={member} isSelf={isSelf} />
      <p style={{ marginTop: 12, fontSize: "0.85rem" }}>
        <Link href={`/admin/logs?user=${encodeURIComponent(member.email)}`}>
          このユーザーの利用ログを見る →
        </Link>
      </p>
    </>
  );
}
