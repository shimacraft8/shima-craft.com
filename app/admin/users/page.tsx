import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { CreateUserForm } from "./CreateUserForm";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = { admin: "管理者", user: "一般" };
const ACCOUNT_LABELS: Record<string, string> = {
  active: "有効",
  suspended: "停止中",
  deleted: "削除済み",
};
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
  page?: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createSupabaseServerClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const q = (searchParams.q ?? "").trim();
  if (q) {
    // 表示名またはメールの部分一致
    query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (searchParams.role === "admin" || searchParams.role === "user") {
    query = query.eq("role", searchParams.role);
  }
  if (["active", "suspended", "deleted"].includes(searchParams.account ?? "")) {
    query = query.eq("account_status", searchParams.account);
  }
  if (["active", "payment_pending", "unpaid", "cancelled"].includes(searchParams.contract ?? "")) {
    query = query.eq("contract_status", searchParams.contract);
  }

  const { data, count } = await query;
  const users = (data ?? []) as Profile[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (searchParams.role) params.set("role", searchParams.role);
    if (searchParams.account) params.set("account", searchParams.account);
    if (searchParams.contract) params.set("contract", searchParams.contract);
    params.set("page", String(p));
    return `/admin/users?${params.toString()}`;
  };

  return (
    <>
      <h1 className="admin-page-title">ユーザー管理</h1>

      <CreateUserForm />

      <form method="GET" className="admin-filter-form">
        <label className="admin-filter-field">
          <span>表示名・メール</span>
          <input type="text" name="q" defaultValue={q} placeholder="検索" />
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
        <button type="submit" className="admin-btn admin-btn--ghost">
          絞り込む
        </button>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.display_name || "（未設定）"}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    <span className={`admin-badge ${badgeClass("account", u.account_status)}`}>
                      {ACCOUNT_LABELS[u.account_status]}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${badgeClass("contract", u.contract_status)}`}>
                      {CONTRACT_LABELS[u.contract_status]}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString("ja-JP")}</td>
                  <td>
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString("ja-JP") : "-"}
                  </td>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className="admin-btn admin-btn--ghost admin-btn--small">
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
        {page > 1 && <Link href={pageHref(page - 1)}>← 前へ</Link>}
        <span>
          {page} / {totalPages}ページ（全{total}件）
        </span>
        {page < totalPages && <Link href={pageHref(page + 1)}>次へ →</Link>}
      </div>
    </>
  );
}
