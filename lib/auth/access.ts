import "server-only";
import { getVerifiedSession } from "@/lib/auth/session";
import { getMember } from "@/lib/members/repo";
import { canUseColorize, type Member } from "@/lib/members/types";

/**
 * ページ・API・Server Actionから見た閲覧者の状態。
 * 認可の根拠は「有効なSession Cookie」＋「Firestore member docのrole/status」であり、
 * クライアント送信値（userId/role/status）やCookie値の中身は信用しない。
 */
export type Viewer =
  | { kind: "anonymous" }
  | { kind: "member"; member: Member; canColorize: boolean }
  | { kind: "admin"; member: Member; canColorize: boolean };

export async function getViewer(): Promise<Viewer> {
  const decoded = await getVerifiedSession();
  if (!decoded) return { kind: "anonymous" };

  const member = await getMember(decoded.uid);
  // memberが存在しない/削除済みは会員として扱わない（招待未完了のGoogleアカウント等）
  if (!member || member.accountStatus === "deleted") return { kind: "anonymous" };

  const isAdmin = member.role === "admin" && member.accountStatus === "active";
  return {
    kind: isAdmin ? "admin" : "member",
    member,
    canColorize: canUseColorize(member),
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
 * 認可の根拠はFirestore member docの role/accountStatus（source of truth）。
 * 追加防御として ADMIN_EMAIL_ALLOWLIST が設定されていれば、メール一致も要求する
 * （allowlist単独では認可しない）。custom claimだけには依存しない。
 */
export async function requireAdmin(): Promise<Member> {
  const viewer = await getViewer();
  if (viewer.kind !== "admin") {
    throw new AdminRequiredError();
  }
  const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(viewer.member.emailLower)) {
    throw new AdminRequiredError();
  }
  return viewer.member;
}

/** カラー化APIで使う: 有効な会員かつ利用可能な契約状態であることを要求。 */
export async function requireColorizeMember(): Promise<Member> {
  const viewer = await getViewer();
  if (viewer.kind === "anonymous" || !viewer.canColorize) {
    throw new AdminRequiredError(); // 呼び出し側で403へ変換（存在は問わない）
  }
  return viewer.member;
}
