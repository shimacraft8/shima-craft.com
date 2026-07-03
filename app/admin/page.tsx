import Link from "next/link";
import { getDashboardStats, getRecentLogs, resolveMemberLabels } from "@/lib/members/admin-queries";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  colorize_started: "カラー化を開始",
  model_download_started: "モデルDL開始",
  model_download_completed: "モデルDL完了",
  colorize_succeeded: "カラー化が成功",
  colorize_failed: "カラー化が失敗",
  colorize_cancelled: "カラー化をキャンセル",
  download_clicked: "ダウンロード操作を実行",
};

export default async function AdminDashboardPage() {
  const [stats, recent] = await Promise.all([getDashboardStats(), getRecentLogs(10)]);
  const labels = await resolveMemberLabels(recent.map((l) => l.userId));

  const cards = [
    { label: "有効ユーザー", value: stats.activeUsers },
    { label: "支払い確認中", value: stats.paymentPending },
    { label: "停止中ユーザー", value: stats.suspended },
    { label: "本日の実行数", value: stats.todayStarted },
    { label: "本日の成功数", value: stats.todaySucceeded },
    { label: "本日の失敗数", value: stats.todayFailed },
  ];

  return (
    <>
      <h1 className="admin-page-title">ダッシュボード</h1>
      <div className="admin-cards">
        {cards.map((c) => (
          <div key={c.label} className="admin-card">
            <p className="admin-card-label">{c.label}</p>
            <p className="admin-card-value">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="admin-page-title">直近の利用ログ</h2>
      <div className="admin-table-wrap">
        {recent.length === 0 ? (
          <p className="admin-empty">まだ利用ログがありません。</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>ユーザー</th>
                <th>操作</th>
                <th>方式</th>
                <th>処理時間</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((log) => {
                const m = labels.get(log.userId);
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("ja-JP")}</td>
                    <td>{m?.displayName || m?.email || "（削除済み）"}</td>
                    <td>{EVENT_LABELS[log.eventType] ?? log.eventType}</td>
                    <td>{log.processingMode ?? "-"}</td>
                    <td>{log.durationMs != null ? `${(log.durationMs / 1000).toFixed(1)}s` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ marginTop: 12, fontSize: "0.85rem" }}>
        <Link href="/admin/logs">利用ログをすべて見る →</Link>
      </p>
    </>
  );
}
