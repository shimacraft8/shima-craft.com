import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminAuditLog } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  initial_admin_ensured: "初期管理者の設定",
  user_created: "ユーザー作成",
  user_updated: "ユーザー更新",
  user_suspended: "利用停止",
  user_reactivated: "利用再開",
  user_deleted: "ユーザー削除（無効化）",
  password_reset_email_sent: "パスワード再設定メール送信",
};

type AuditWithProfiles = AdminAuditLog & {
  admin: { display_name: string; email: string } | null;
  target: { display_name: string; email: string } | null;
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string };
}) {
  const supabase = createSupabaseServerClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("admin_audit_logs")
    .select(
      "*, admin:profiles!admin_audit_logs_admin_user_id_fkey(display_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (searchParams.action) query = query.eq("action", searchParams.action);

  const { data, count } = await query;
  const logs = (data ?? []) as unknown as AuditWithProfiles[];

  // target_user_id はFKを張っていないため表示名を別途解決する
  const targetIds = Array.from(new Set(logs.map((l) => l.target_user_id).filter(Boolean))) as string[];
  const targetMap = new Map<string, { display_name: string; email: string }>();
  if (targetIds.length > 0) {
    const { data: targets } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", targetIds);
    for (const t of targets ?? []) {
      targetMap.set(t.id as string, { display_name: t.display_name, email: t.email });
    }
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.action) params.set("action", searchParams.action);
    params.set("page", String(p));
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
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn--ghost">
          絞り込む
        </button>
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
                const target = log.target_user_id ? targetMap.get(log.target_user_id) : null;
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString("ja-JP")}</td>
                    <td>{log.admin?.display_name || log.admin?.email || "（削除済み）"}</td>
                    <td>{ACTION_LABELS[log.action] ?? log.action}</td>
                    <td>{target ? target.display_name || target.email : log.target_user_id ? "（削除済み）" : "-"}</td>
                    <td style={{ whiteSpace: "normal", maxWidth: 260, fontSize: "0.75rem" }}>
                      {log.before_data ? JSON.stringify(log.before_data) : "-"}
                    </td>
                    <td style={{ whiteSpace: "normal", maxWidth: 260, fontSize: "0.75rem" }}>
                      {log.after_data ? JSON.stringify(log.after_data) : "-"}
                    </td>
                    <td style={{ fontSize: "0.72rem" }}>{log.request_id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-pagination">
        {page > 1 && <Link href={pageHref(page - 1)}>← 前へ</Link>}
        <span>
          {page} / {totalPages}ページ（全{total}件）
        </span>
        {page < totalPages && <Link href={pageHref(page + 1)}>次へ →</Link>}
      </div>
    </>
  );
}
