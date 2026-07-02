import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { COLORIZE_LOG_EVENT_TYPES, type ColorizationLog } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const EVENT_LABELS: Record<string, string> = {
  colorize_started: "カラー化開始",
  model_download_started: "モデルDL開始",
  model_download_completed: "モデルDL完了",
  colorize_succeeded: "成功",
  colorize_failed: "失敗",
  colorize_cancelled: "キャンセル",
  download_clicked: "ダウンロード操作",
};

type LogWithProfile = ColorizationLog & {
  profiles: { display_name: string; email: string } | null;
};

type SearchParams = {
  user?: string;
  from?: string;
  to?: string;
  result?: string;
  event?: string;
  error?: string;
  mode?: string;
  page?: string;
};

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createSupabaseServerClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;

  // ユーザー絞り込み（メール・表示名の部分一致 → id解決）
  let userIds: string[] | null = null;
  const userQuery = (searchParams.user ?? "").trim();
  if (userQuery) {
    const { data: matched } = await supabase
      .from("profiles")
      .select("id")
      .or(`display_name.ilike.%${userQuery}%,email.ilike.%${userQuery}%`)
      .limit(100);
    userIds = (matched ?? []).map((m) => m.id as string);
    if (userIds.length === 0) userIds = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("colorization_logs")
    .select("*, profiles(display_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (userIds) query = query.in("user_id", userIds);
  if (searchParams.from) query = query.gte("created_at", `${searchParams.from}T00:00:00`);
  if (searchParams.to) query = query.lte("created_at", `${searchParams.to}T23:59:59`);
  if (searchParams.result === "succeeded") query = query.eq("event_type", "colorize_succeeded");
  if (searchParams.result === "failed") query = query.eq("event_type", "colorize_failed");
  if (COLORIZE_LOG_EVENT_TYPES.includes(searchParams.event as never)) {
    query = query.eq("event_type", searchParams.event);
  }
  if (searchParams.error) query = query.ilike("error_code", `%${searchParams.error.trim()}%`);
  if (searchParams.mode === "webgpu" || searchParams.mode === "wasm") {
    query = query.eq("processing_mode", searchParams.mode);
  }

  const { data, count } = await query;
  const logs = (data ?? []) as LogWithProfile[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v);
    }
    params.set("page", String(p));
    return `/admin/logs?${params.toString()}`;
  };

  return (
    <>
      <h1 className="admin-page-title">利用ログ</h1>

      <form method="GET" className="admin-filter-form">
        <label className="admin-filter-field">
          <span>ユーザー（表示名・メール）</span>
          <input type="text" name="user" defaultValue={searchParams.user ?? ""} />
        </label>
        <label className="admin-filter-field">
          <span>開始日</span>
          <input type="date" name="from" defaultValue={searchParams.from ?? ""} />
        </label>
        <label className="admin-filter-field">
          <span>終了日</span>
          <input type="date" name="to" defaultValue={searchParams.to ?? ""} />
        </label>
        <label className="admin-filter-field">
          <span>成功・失敗</span>
          <select name="result" defaultValue={searchParams.result ?? ""}>
            <option value="">すべて</option>
            <option value="succeeded">成功のみ</option>
            <option value="failed">失敗のみ</option>
          </select>
        </label>
        <label className="admin-filter-field">
          <span>イベント種別</span>
          <select name="event" defaultValue={searchParams.event ?? ""}>
            <option value="">すべて</option>
            {COLORIZE_LOG_EVENT_TYPES.map((e) => (
              <option key={e} value={e}>
                {EVENT_LABELS[e] ?? e}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-filter-field">
          <span>エラーコード</span>
          <input type="text" name="error" defaultValue={searchParams.error ?? ""} />
        </label>
        <label className="admin-filter-field">
          <span>処理方式</span>
          <select name="mode" defaultValue={searchParams.mode ?? ""}>
            <option value="">すべて</option>
            <option value="webgpu">WebGPU</option>
            <option value="wasm">WASM</option>
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn--ghost">
          絞り込む
        </button>
      </form>

      <div className="admin-table-wrap">
        {logs.length === 0 ? (
          <p className="admin-empty">条件に一致するログがありません。</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>ユーザー</th>
                <th>メール</th>
                <th>操作</th>
                <th>結果</th>
                <th>処理時間</th>
                <th>方式</th>
                <th>画像寸法</th>
                <th>エラーコード</th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString("ja-JP")}</td>
                  <td>{log.profiles?.display_name || "（未設定）"}</td>
                  <td>{log.profiles?.email || "（削除済み）"}</td>
                  <td>{EVENT_LABELS[log.event_type] ?? log.event_type}</td>
                  <td>
                    {log.event_type === "colorize_succeeded" ? (
                      <span className="admin-badge admin-badge--ok">成功</span>
                    ) : log.event_type === "colorize_failed" ? (
                      <span className="admin-badge admin-badge--bad">失敗</span>
                    ) : (
                      <span className="admin-badge">{log.status || "-"}</span>
                    )}
                  </td>
                  <td>{log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : "-"}</td>
                  <td>{log.processing_mode ?? "-"}</td>
                  <td>
                    {log.image_width && log.image_height
                      ? `${log.image_width}×${log.image_height}`
                      : "-"}
                  </td>
                  <td>{log.error_code ?? "-"}</td>
                  <td>
                    {log.browser_name ?? "-"} / {log.device_type ?? "-"}
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
