import Link from "next/link";
import { findMemberIdsBySearch, listLogs, resolveMemberLabels } from "@/lib/members/admin-queries";
import { COLORIZE_LOG_EVENT_TYPES } from "@/lib/members/types";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  colorize_started: "カラー化開始",
  model_download_started: "モデルDL開始",
  model_download_completed: "モデルDL完了",
  colorize_succeeded: "成功",
  colorize_failed: "失敗",
  colorize_cancelled: "キャンセル",
  download_clicked: "ダウンロード操作",
};

type SearchParams = {
  user?: string;
  event?: string;
  result?: string;
  mode?: string;
  error?: string;
  cursor?: string;
};

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  // ユーザー絞り込み（メール前方一致 → uid解決）
  let userId: string | undefined;
  const userQuery = (searchParams.user ?? "").trim();
  if (userQuery) {
    const ids = await findMemberIdsBySearch(userQuery);
    userId = ids[0] ?? "__no_match__";
  }

  const result = searchParams.result === "succeeded" || searchParams.result === "failed" ? searchParams.result : undefined;
  const eventType = COLORIZE_LOG_EVENT_TYPES.includes(searchParams.event as never) ? searchParams.event : undefined;
  const mode = searchParams.mode === "webgpu" || searchParams.mode === "wasm" ? searchParams.mode : undefined;

  const { items: logs, nextCursor } = await listLogs({
    userId,
    result,
    eventType,
    processingMode: mode,
    errorCode: searchParams.error?.trim() || undefined,
    cursor: searchParams.cursor ?? null,
  });
  const labels = await resolveMemberLabels(logs.map((l) => l.userId));

  const nextHref = (cursor: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "cursor") params.set(k, v);
    params.set("cursor", cursor);
    return `/admin/logs?${params.toString()}`;
  };

  return (
    <>
      <h1 className="admin-page-title">利用ログ</h1>

      <form method="GET" className="admin-filter-form">
        <label className="admin-filter-field">
          <span>ユーザー（メール前方一致）</span>
          <input type="text" name="user" defaultValue={searchParams.user ?? ""} />
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
              <option key={e} value={e}>{EVENT_LABELS[e] ?? e}</option>
            ))}
          </select>
        </label>
        <label className="admin-filter-field">
          <span>処理方式</span>
          <select name="mode" defaultValue={searchParams.mode ?? ""}>
            <option value="">すべて</option>
            <option value="webgpu">WebGPU</option>
            <option value="wasm">WASM</option>
          </select>
        </label>
        <label className="admin-filter-field">
          <span>エラーコード</span>
          <input type="text" name="error" defaultValue={searchParams.error ?? ""} />
        </label>
        <button type="submit" className="admin-btn admin-btn--ghost">絞り込む</button>
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
              {logs.map((log) => {
                const m = labels.get(log.userId);
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("ja-JP")}</td>
                    <td>{m?.displayName || "（未設定）"}</td>
                    <td>{m?.email || "（削除済み）"}</td>
                    <td>{EVENT_LABELS[log.eventType] ?? log.eventType}</td>
                    <td>
                      {log.eventType === "colorize_succeeded" ? (
                        <span className="admin-badge admin-badge--ok">成功</span>
                      ) : log.eventType === "colorize_failed" ? (
                        <span className="admin-badge admin-badge--bad">失敗</span>
                      ) : (
                        <span className="admin-badge">{log.status || "-"}</span>
                      )}
                    </td>
                    <td>{log.durationMs != null ? `${(log.durationMs / 1000).toFixed(1)}s` : "-"}</td>
                    <td>{log.processingMode ?? "-"}</td>
                    <td>{log.imageWidth && log.imageHeight ? `${log.imageWidth}×${log.imageHeight}` : "-"}</td>
                    <td>{log.errorCode ?? "-"}</td>
                    <td>{log.browserName ?? "-"} / {log.deviceType ?? "-"}</td>
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
