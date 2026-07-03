import Link from "next/link";
import { listMembers } from "@/lib/members/admin-queries";
import type { AccountStatus, ContractStatus, UserRole } from "@/lib/members/types";
import { InviteUserForm } from "./InviteUserForm";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = { admin: "管理者", user: "一般" };
const ACCOUNT_LABELS: Record<string, string> = { active: "有効", suspended: "停止中", deleted: "削除済み" };
const CONTRACT_LABELS: Record<string, string> = {
  active: "契約中",
  payment_pending: "支払い確認中",
  unpaid: "未払い",
  cancelled: "解約",
};

function badgeClass(kind: "account" | "contract", v: string): string {
  if (kind === "account") {
    return v === "active" ? "admin-badge--ok" : v === "suspended" ? "admin-badge--warn" : "admin-badge--bad";
  }
  return v === "active" ? "admin-badge--ok" : v === "payment_pending" ? "admin-badge--warn" : "admin-badge--bad";
}

type SearchParams = {
  q?: string;
  role?: string;
  account?: string;
  contract?: string;
  cursor?: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const role = ["admin", "user"].includes(searchParams.role ?? "") ? (searchParams.role as UserRole) : undefined;
  const accountStatus = ["active", "suspended", "deleted"].includes(searchParams.account ?? "")
    ? (searchParams.account as AccountStatus)
    : undefined;
  const contractStatus = ["active", "payment_pending", "unpaid", "cancelled"].includes(searchParams.contract ?? "")
    ? (searchParams.contract as ContractStatus)
    : undefined;
  const q = (searchParams.q ?? "").trim();

  const { items: users, nextCursor } = await listMembers({
    role,
    accountStatus,
    contractStatus,
    search: q || undefined,
    cursor: searchParams.cursor ?? null,
  });

  const nextHref = (cursor: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (searchParams.role) params.set("role", searchParams.role);
    if (searchParams.account) params.set("account", searchParams.account);
    if (searchParams.contract) params.set("contract", searchParams.contract);
    params.set("cursor", cursor);
    return `/admin/users?${params.toString()}`;
  };

  return (
    <>
      <h1 className="admin-page-title">ユーザー管理</h1>

      <InviteUserForm />

      <form method="GET" className="admin-filter-form">
        <label className="admin-filter-field">
          <span>メール（前方一致）</span>
          <input type="text" name="q" defaultValue={q} placeholder="例: taro@" />
        </label>
        <label className="admin-filter-field">
          <span>role</span>
          <select name="role" defaultValue={searchParams.role ?? ""}>
            <option value="">すべて</option>
            <option value="admin">管理者</option>
            <option value="user">一般</option>
          </select>
        </label>
        <label className="admin-filter-field">
          <span>アカウント状態</span>
          <select name="account" defaultValue={searchParams.account ?? ""}>
            <option value="">すべて</option>
            <option value="active">有効</option>
            <option value="suspended">停止中</option>
            <option value="deleted">削除済み</option>
          </select>
        </label>
        <label className="admin-filter-field">
          <span>契約状態</span>
          <select name="contract" defaultValue={searchParams.contract ?? ""}>
            <option value="">すべて</option>
            <option value="active">契約中</option>
            <option value="payment_pending">支払い確認中</option>
            <option value="unpaid">未払い</option>
            <option value="cancelled">解約</option>
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn--ghost">絞り込む</button>
      </form>

      <div className="admin-table-wrap">
        {users.length === 0 ? (
          <p className="admin-empty">条件に一致するユーザーがいません。</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>表示名</th>
                <th>メール</th>
                <th>role</th>
                <th>アカウント</th>
                <th>契約</th>
                <th>作成日</th>
                <th>最終ログイン</th>
                <th>最終利用</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.displayName || "（未設定）"}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    <span className={`admin-badge ${badgeClass("account", u.accountStatus)}`}>
                      {ACCOUNT_LABELS[u.accountStatus]}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${badgeClass("contract", u.contractStatus)}`}>
                      {CONTRACT_LABELS[u.contractStatus]}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("ja-JP")}</td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("ja-JP") : "-"}</td>
                  <td>{u.lastUsedAt ? new Date(u.lastUsedAt).toLocaleString("ja-JP") : "-"}</td>
                  <td>
                    <Link href={`/admin/users/${u.uid}`} className="admin-btn admin-btn--ghost admin-btn--small">
                      詳細・編集
                    </Link>
                  </td>
                </tr>
              ))}
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
