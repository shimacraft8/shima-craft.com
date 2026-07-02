import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ColorizationLog } from "@/lib/supabase/types";

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

type LogWithProfile = ColorizationLog & {
  profiles: { display_name: string; email: string } | null;
};

/** ダッシュボード。データ取得は閲覧者自身のセッション（RLS適用）で行う。 */
export default async function AdminDashboardPage() {
  const supabase = createSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [activeUsers, suspendedUsers, started, succeeded, failed, trialSucceeded, recent] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_status", "active"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("account_status", "suspended"),
      supabase
        .from("colorization_logs")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "colorize_started")
        .gte("created_at", todayIso),
      supabase
        .from("colorization_logs")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "colorize_succeeded")
        .gte("created_at", todayIso),
      supabase
        .from("colorization_logs")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "colorize_failed")
        .gte("created_at", todayIso),
      supabase
        .from("trial_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "trial_succeeded")
        .gte("created_at", todayIso),
      supabase
        .from("colorization_logs")
        .select("*, profiles(display_name, email)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const cards = [
    { label: "有効ユーザー", value: activeUsers.count ?? 0 },
    { label: "停止中ユーザー", value: suspendedUsers.count ?? 0 },
    { label: "本日の実行数", value: started.count ?? 0 },
    { label: "本日の成功数", value: succeeded.count ?? 0 },
    { label: "本日の失敗数", value: failed.count ?? 0 },
    { label: "本日のお試し成功数", value: trialSucceeded.count ?? 0 },
  ];

  const logs = (recent.data ?? []) as LogWithProfile[];

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
        {logs.length === 0 ? (
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
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString("ja-JP")}</td>
                  <td>{log.profiles?.display_name || log.profiles?.email || "（削除済み）"}</td>
                  <td>{EVENT_LABELS[log.event_type] ?? log.event_type}</td>
                  <td>{log.processing_mode ?? "-"}</td>
                  <td>{log.duration_ms != null ? `${(log.duration_ms / 1000).toFixed(1)}s` : "-"}</td>
                </tr>
              ))}
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
