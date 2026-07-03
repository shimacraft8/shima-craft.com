import Link from "next/link";
import { listAuditLogs, resolveMemberLabels } from "@/lib/members/admin-queries";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  invitation_created: "招待作成",
  invitation_resent: "招待再送",
  invitation_revoked: "招待取消",
  member_updated: "ユーザー更新",
  member_suspended: "利用停止",
  member_reactivated: "利用再開",
  member_deleted: "ユーザー削除（無効化）",
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { action?: string; cursor?: string };
}) {
  const action = searchParams.action || undefined;
  const { items: logs, nextCursor } = await listAuditLogs({ action, cursor: searchParams.cursor ?? null });

  const ids: string[] = [];
  for (const l of logs) {
    ids.push(l.adminUserId);
    if (l.targetUserId) ids.push(l.targetUserId);
  }
  const labels = await resolveMemberLabels(ids);

  const nextHref = (cursor: string) => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    params.set("cursor", cursor);
    return `/admin/audit-logs?${params.toString()}`;
  };

  return (
    <>
      <h1 className="admin-page-title">管理者監査ログ</h1>
      <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 14 }}>
        管理者の操作履歴です。この画面から削除・編集することはできません。
      </p>

      <form method="GET" className="admin-filter-form">
        <label className="admin-filter-field">
          <span>操作種別</span>
          <select name="action" defaultValue={searchParams.action ?? ""}>
            <option value="">すべて</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn--ghost">絞り込む</button>
      </form>

      <div className="admin-table-wrap">
        {logs.length === 0 ? (
          <p className="admin-empty">監査ログがありません。</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>操作者</th>
                <th>操作</th>
                <th>対象ユーザー</th>
                <th>変更前</th>
                <th>変更後</th>
                <th>操作ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const adminM = labels.get(log.adminUserId);
                const targetM = log.targetUserId ? labels.get(log.targetUserId) : null;
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("ja-JP")}</td>
                    <td>{adminM?.displayName || adminM?.email || "（削除済み）"}</td>
                    <td>{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td>{targetM ? targetM.displayName || targetM.email : log.targetUserId ? "（対象なし表示）" : "-"}</td>
                    <td style={{ whiteSpace: "normal", maxWidth: 260, fontSize: "0.75rem" }}>
                      {log.beforeData ? JSON.stringify(log.beforeData) : "-"}
                    </td>
                    <td style={{ whiteSpace: "normal", maxWidth: 260, fontSize: "0.75rem" }}>
                      {log.afterData ? JSON.stringify(log.afterData) : "-"}
                    </td>
                    <td style={{ fontSize: "0.72rem" }}>{log.requestId}</td>
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
