import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canUseColorize, type Profile } from "@/lib/supabase/types";

/** ページ・API・Server Actionから見た閲覧者の状態。 */
export type Viewer =
  | { kind: "anonymous" }
  | { kind: "member"; profile: Profile; canColorize: boolean }
  | { kind: "admin"; profile: Profile; canColorize: boolean };

/**
 * セッションと profiles をサーバー側で照合して閲覧者を判定する。
 * roleはDBの値のみを根拠とし、Cookie・クライアント送信値では判定しない。
 */
export async function getViewer(): Promise<Viewer> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  // profiles行が無い/取得できない場合は会員として扱わない
  if (!profile) return { kind: "anonymous" };
  if (profile.account_status !== "active") {
    // 停止・削除済みはセッションがあっても member 扱いにしない
    // （ログイン時にも弾くが、停止処理がセッション存続中に行われた場合の防御）
    return {
      kind: profile.role === "admin" ? "admin" : "member",
      profile,
      canColorize: false,
    };
  }

  return {
    kind: profile.role === "admin" ? "admin" : "member",
    profile,
    canColorize: canUseColorize(profile),
  };
}

export class AdminRequiredError extends Error {
  constructor() {
    super("admin required");
    this.name = "AdminRequiredError";
  }
}

/**
 * admin必須の処理の前段で必ず呼ぶ。admin以外には存在を悟らせないよう
 * 呼び出し側で404等へ変換する。
 *
 * 認可の根拠はDBの role/account_status。追加防御として、環境変数
 * ADMIN_EMAIL_ALLOWLIST（カンマ区切り）が設定されている場合は
 * メールがその一覧に含まれることも要求する（allowlist単独では認可しない）。
 */
export async function requireAdmin(): Promise<Profile> {
  const viewer = await getViewer();
  if (viewer.kind !== "admin" || viewer.profile.account_status !== "active") {
    throw new AdminRequiredError();
  }
  const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(viewer.profile.email.toLowerCase())) {
    throw new AdminRequiredError();
  }
  return viewer.profile;
}
