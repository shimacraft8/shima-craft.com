import Link from "next/link";
import { listInvitations } from "@/lib/members/admin-queries";
import { InvitationRowActions } from "./InvitationRowActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "招待中",
  claimed: "登録済み",
  expired: "期限切れ",
  revoked: "取消済み",
  delivery_failed: "メール送信失敗",
};

function statusBadge(v: string): string {
  if (v === "claimed") return "admin-badge--ok";
  if (v === "pending") return "admin-badge--warn";
  return "admin-badge--bad";
}

export default async function AdminInvitationsPage({
  searchParams,
}: {
  searchParams: { status?: string; cursor?: string };
}) {
  const status = ["pending", "claimed", "expired", "revoked", "delivery_failed"].includes(searchParams.status ?? "")
    ? (searchParams.status as never)
    : undefined;
  const { items, nextCursor } = await listInvitations({ status, cursor: searchParams.cursor ?? null });

  const now = Date.now();
  const nextHref = (cursor: string) => {
    const params = new URLSearchParams();
    if (searchParams.status) params.set("status", searchParams.status);
    params.set("cursor", cursor);
    return `/admin/invitations?${params.toString()}`;
  };

  return (
    <>
      <h1 className="admin-page-title">招待</h1>
      <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 14 }}>
        新規ユーザーの招待は「ユーザー管理」画面の「＋ 新規ユーザーを招待」から行えます。ここでは送信済み招待の状態確認・再送・取消ができます。
      </p>

      <form method="GET" className="admin-filter-form">
        <label className="admin-filter-field">
          <span>状態</span>
          <select name="status" defaultValue={searchParams.status ?? ""}>
            <option value="">すべて</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn--ghost">絞り込む</button>
      </form>

      <div className="admin-table-wrap">
        {items.length === 0 ? (
          <p className="admin-empty">招待がありません。</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>メール</th>
                <th>表示名</th>
                <th>role</th>
                <th>契約</th>
                <th>状態</th>
                <th>作成日</th>
                <th>有効期限</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => {
                const expired = inv.status === "pending" && new Date(inv.expiresAt).getTime() < now;
                const displayStatus = expired ? "expired" : inv.status;
                return (
                  <tr key={inv.id}>
                    <td>{inv.emailLower}</td>
                    <td>{inv.displayName || "（未設定）"}</td>
                    <td>{inv.role === "admin" ? "管理者" : "一般"}</td>
                    <td>{inv.contractStatus}</td>
                    <td>
                      <span className={`admin-badge ${statusBadge(displayStatus)}`}>
                        {STATUS_LABELS[displayStatus] ?? displayStatus}
                      </span>
                    </td>
                    <td>{new Date(inv.createdAt).toLocaleDateString("ja-JP")}</td>
                    <td>{new Date(inv.expiresAt).toLocaleDateString("ja-JP")}</td>
                    <td>
                      {inv.status !== "claimed" && inv.status !== "revoked" ? (
                        <InvitationRowActions invitationId={inv.id} />
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-pagination">
        {nextCursor ? <Link href={nextHref(nextCursor)}>次のページ →</Link> : <span>最後のページです</span>}
      </div>
    </>
  );
}
