"use server";

import { randomUUID, createHash } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin, AdminRequiredError } from "@/lib/auth/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AccountStatus, ContractStatus, Profile, UserRole } from "@/lib/supabase/types";

/**
 * 管理者用Server Action群。
 * すべてのActionは requireAdmin() を最初に実行し（UI表示とは独立した認可）、
 * 操作を admin_audit_logs へ記録する。
 * 秘密情報（パスワード・トークン）は監査ログへ保存しない。
 */

export type AdminActionState = { ok?: string; error?: string; requestId?: string } | null;

const ROLES: UserRole[] = ["admin", "user"];
const ACCOUNT_STATUSES: AccountStatus[] = ["active", "suspended", "deleted"];
const CONTRACT_STATUSES: ContractStatus[] = ["active", "payment_pending", "unpaid", "cancelled"];

/** 監査ログ用に、操作者のIPをハッシュ化する（生IPは保存しない）。 */
function auditIpHash(): string | null {
  try {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    const ip = (fwd ? fwd.split(",")[0] : h.get("x-real-ip")) ?? "";
    if (!ip) return null;
    const salt = process.env.LOG_IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    return createHash("sha256").update(`audit:${salt}:${ip.trim()}`).digest("hex");
  } catch {
    return null;
  }
}

async function writeAudit(params: {
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  requestId: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("admin_audit_logs").insert({
    admin_user_id: params.adminUserId,
    action: params.action,
    target_user_id: params.targetUserId,
    before_data: params.before ?? null,
    after_data: params.after ?? null,
    request_id: params.requestId,
    ip_hash: auditIpHash(),
    user_agent: (headers().get("user-agent") ?? "").slice(0, 512),
  });
  if (error) {
    // 監査ログが書けない操作は成立させない（fail-closed）
    throw new Error(`audit log failed: ${error.code}`);
  }
}

/** profilesから監査用のスナップショットを作る（秘密情報は含まれない）。 */
function profileSnapshot(p: Profile | null): Record<string, unknown> | null {
  if (!p) return null;
  return {
    email: p.email,
    display_name: p.display_name,
    role: p.role,
    account_status: p.account_status,
    contract_status: p.contract_status,
    notes: p.notes,
  };
}

function errState(message: string, requestId: string): AdminActionState {
  return { error: message, requestId };
}

function handleActionError(err: unknown, requestId: string): AdminActionState {
  if (err instanceof AdminRequiredError) {
    return errState("この操作を行う権限がありません。", requestId);
  }
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("LAST_ADMIN_PROTECTED")) {
    return errState("最後の有効な管理者を削除・降格・停止することはできません。", requestId);
  }
  console.error("[admin] action failed", { requestId, message: msg.slice(0, 200) });
  return errState("操作に失敗しました。時間をおいて再度お試しください。", requestId);
}

async function fetchProfile(id: string): Promise<Profile | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  return data ?? null;
}

const BAN_FOREVER = "876000h"; // 100年（実質無期限）

/** アカウント状態に応じてauthレベルのban/解除を同期する（二重防御）。 */
async function syncAuthBan(userId: string, status: AccountStatus): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(userId, {
    ban_duration: status === "active" ? "none" : BAN_FOREVER,
  });
}

// ─────────────────────────────────────────────
// ユーザー作成（招待メール方式。平文パスワードは扱わない）
// ─────────────────────────────────────────────
export async function createUserAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = randomUUID();
  try {
    const adminProfile = await requireAdmin();

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 100);
    const role = String(formData.get("role") ?? "user") as UserRole;
    const contractStatus = String(formData.get("contract_status") ?? "payment_pending") as ContractStatus;
    const notes = String(formData.get("notes") ?? "").slice(0, 2000);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errState("メールアドレスの形式が正しくありません。", requestId);
    }
    if (!ROLES.includes(role) || !CONTRACT_STATUSES.includes(contractStatus)) {
      return errState("入力値が不正です。", requestId);
    }

    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) {
      return errState("このメールアドレスは既に登録されています。", requestId);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
      data: { display_name: displayName },
    });
    if (inviteErr || !invited.user) {
      return errState("招待メールの送信に失敗しました。メールアドレスをご確認ください。", requestId);
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update({
        display_name: displayName,
        role,
        contract_status: contractStatus,
        notes,
      })
      .eq("id", invited.user.id);
    if (updErr) throw new Error(updErr.message);

    await writeAudit({
      adminUserId: adminProfile.id,
      action: "user_created",
      targetUserId: invited.user.id,
      after: { email, display_name: displayName, role, contract_status: contractStatus, notes },
      requestId,
    });

    revalidatePath("/admin/users");
    return { ok: `${email} に招待メールを送信しました。`, requestId };
  } catch (err) {
    return handleActionError(err, requestId);
  }
}

// ─────────────────────────────────────────────
// ユーザー更新
// ─────────────────────────────────────────────
export async function updateUserAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = randomUUID();
  try {
    const adminProfile = await requireAdmin();

    const userId = String(formData.get("user_id") ?? "");
    if (!/^[0-9a-f-]{36}$/.test(userId)) return errState("対象ユーザーが不正です。", requestId);

    const before = await fetchProfile(userId);
    if (!before) return errState("対象ユーザーが見つかりません。", requestId);

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 100);
    const role = String(formData.get("role") ?? before.role) as UserRole;
    const accountStatus = String(formData.get("account_status") ?? before.account_status) as AccountStatus;
    const contractStatus = String(
      formData.get("contract_status") ?? before.contract_status
    ) as ContractStatus;
    const notes = String(formData.get("notes") ?? "").slice(0, 2000);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errState("メールアドレスの形式が正しくありません。", requestId);
    }
    if (
      !ROLES.includes(role) ||
      !ACCOUNT_STATUSES.includes(accountStatus) ||
      !CONTRACT_STATUSES.includes(contractStatus)
    ) {
      return errState("入力値が不正です。", requestId);
    }
    // 自分自身の降格・停止は誤操作防止のため専用の導線でも行えない
    if (userId === adminProfile.id && (role !== "admin" || accountStatus !== "active")) {
      return errState("自分自身の権限・状態は変更できません。", requestId);
    }

    const admin = createSupabaseAdminClient();

    if (email !== before.email) {
      const { error: mailErr } = await admin.auth.admin.updateUserById(userId, { email });
      if (mailErr) return errState("メールアドレスの変更に失敗しました。", requestId);
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update({
        email,
        display_name: displayName,
        role,
        account_status: accountStatus,
        contract_status: contractStatus,
        notes,
      })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    await syncAuthBan(userId, accountStatus);

    await writeAudit({
      adminUserId: adminProfile.id,
      action: "user_updated",
      targetUserId: userId,
      before: profileSnapshot(before),
      after: { email, display_name: displayName, role, account_status: accountStatus, contract_status: contractStatus, notes },
      requestId,
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { ok: "更新しました。", requestId };
  } catch (err) {
    return handleActionError(err, requestId);
  }
}

// ─────────────────────────────────────────────
// 停止 / 再開 / 削除（soft delete）
// ─────────────────────────────────────────────
async function changeAccountStatus(
  userId: string,
  to: AccountStatus,
  action: string,
  requestId: string
): Promise<AdminActionState> {
  const adminProfile = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(userId)) return errState("対象ユーザーが不正です。", requestId);
  if (userId === adminProfile.id) {
    return errState("自分自身のアカウント状態は変更できません。", requestId);
  }

  const before = await fetchProfile(userId);
  if (!before) return errState("対象ユーザーが見つかりません。", requestId);

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("profiles").update({ account_status: to }).eq("id", userId);
  if (error) throw new Error(error.message);

  await syncAuthBan(userId, to);

  await writeAudit({
    adminUserId: adminProfile.id,
    action,
    targetUserId: userId,
    before: { account_status: before.account_status },
    after: { account_status: to },
    requestId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return {
    ok: to === "active" ? "利用を再開しました。" : to === "suspended" ? "利用を停止しました。" : "削除（無効化）しました。",
    requestId,
  };
}

export async function suspendUserAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = randomUUID();
  try {
    return await changeAccountStatus(String(formData.get("user_id") ?? ""), "suspended", "user_suspended", requestId);
  } catch (err) {
    return handleActionError(err, requestId);
  }
}

export async function reactivateUserAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = randomUUID();
  try {
    return await changeAccountStatus(String(formData.get("user_id") ?? ""), "active", "user_reactivated", requestId);
  } catch (err) {
    return handleActionError(err, requestId);
  }
}

/**
 * 削除は soft delete（account_status='deleted' + authレベルのban）。
 * 利用ログ・監査ログは保持される（プライバシーポリシー記載の保持方針に従う）。
 */
export async function softDeleteUserAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = randomUUID();
  try {
    const confirmed = String(formData.get("confirm") ?? "") === "true";
    if (!confirmed) return errState("削除の確認が行われていません。", requestId);
    return await changeAccountStatus(String(formData.get("user_id") ?? ""), "deleted", "user_deleted", requestId);
  } catch (err) {
    return handleActionError(err, requestId);
  }
}

// ─────────────────────────────────────────────
// パスワード再設定メール
// ─────────────────────────────────────────────
export async function sendPasswordResetAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = randomUUID();
  try {
    const adminProfile = await requireAdmin();
    const userId = String(formData.get("user_id") ?? "");
    if (!/^[0-9a-f-]{36}$/.test(userId)) return errState("対象ユーザーが不正です。", requestId);

    const target = await fetchProfile(userId);
    if (!target) return errState("対象ユーザーが見つかりません。", requestId);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const admin = createSupabaseAdminClient();
    // recoveryリンクを生成しメール送信（Supabaseのメールテンプレートを利用）
    const { error } = await admin.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
    });
    if (error) return errState("再設定メールの送信に失敗しました。", requestId);

    await writeAudit({
      adminUserId: adminProfile.id,
      action: "password_reset_email_sent",
      targetUserId: userId,
      after: { email: target.email },
      requestId,
    });

    return { ok: `${target.email} へパスワード再設定メールを送信しました。`, requestId };
  } catch (err) {
    return handleActionError(err, requestId);
  }
}
