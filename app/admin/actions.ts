"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin, AdminRequiredError } from "@/lib/auth/access";
import {
  applyMemberMutation,
  MemberOpError,
  writeAuditOnly,
} from "@/lib/members/admin-ops";
import {
  createInvitation,
  markInvitationDeliveryFailed,
  resendInvitation,
  revokeInvitation,
} from "@/lib/members/invitations";
import { getMember } from "@/lib/members/repo";
import { sendInvitationEmail } from "@/lib/mail/invitation";
import { ipHashFromHeaders, newRequestId } from "@/lib/members/tokens";
import type {
  AccountStatus,
  ContractStatus,
  UserRole,
} from "@/lib/members/types";

export type AdminActionState = { ok?: string; error?: string; requestId?: string } | null;

const ROLES: UserRole[] = ["admin", "user"];
const ACCOUNT_STATUSES: AccountStatus[] = ["active", "suspended", "deleted"];
const CONTRACT_STATUSES: ContractStatus[] = ["active", "payment_pending", "unpaid", "cancelled"];

function auditContext() {
  const h = headers();
  return {
    ipHash: ipHashFromHeaders(h),
    userAgent: (h.get("user-agent") ?? "").slice(0, 512),
  };
}

function err(message: string, requestId: string): AdminActionState {
  return { error: message, requestId };
}

function handleError(e: unknown, requestId: string): AdminActionState {
  if (e instanceof AdminRequiredError) return err("この操作を行う権限がありません。", requestId);
  if (e instanceof MemberOpError) {
    if (e.code === "LAST_ADMIN") return err("最後の有効な管理者を降格・停止・削除することはできません。", requestId);
    if (e.code === "NOT_FOUND") return err("対象ユーザーが見つかりません。", requestId);
    if (e.code === "SELF_FORBIDDEN") return err("自分自身のこの操作は行えません。", requestId);
  }
  console.error("[admin] action failed", { requestId, name: e instanceof Error ? e.name : typeof e });
  return err("操作に失敗しました。時間をおいて再度お試しください。", requestId);
}

const UUID_RE = /^[A-Za-z0-9_-]{6,128}$/; // Firebase uid / invitation id

// ─────────────────────────────────────────────
// 招待作成（＝新規ユーザー。Googleログインで本人がclaim）
// ─────────────────────────────────────────────
export async function createInvitationAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 100);
    const role = String(formData.get("role") ?? "user") as UserRole;
    const contractStatus = String(formData.get("contract_status") ?? "payment_pending") as ContractStatus;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return err("メールアドレスの形式が正しくありません。", requestId);
    }
    if (!ROLES.includes(role) || !CONTRACT_STATUSES.includes(contractStatus)) {
      return err("入力値が不正です。", requestId);
    }

    const { invitation, rawToken } = await createInvitation({
      emailLower: email,
      displayName,
      role,
      accountStatus: "active",
      contractStatus,
      createdBy: admin.uid,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${siteUrl}/login?invite=${encodeURIComponent(rawToken)}&next=/tools/photo-colorize`;
    const mail = await sendInvitationEmail({ toEmail: email, displayName, inviteUrl });

    const ctx = auditContext();
    await writeAuditOnly({
      adminUserId: admin.uid,
      action: "invitation_created",
      targetUserId: null,
      afterData: { email, role, contractStatus, invitationId: invitation.id, mailSent: mail.ok },
      requestId,
      ...ctx,
    });

    if (!mail.ok) {
      await markInvitationDeliveryFailed(invitation.id);
      return {
        ok: `招待を作成しましたが、メール送信に失敗しました（${email}）。招待一覧から再送してください。`,
        requestId,
      };
    }

    revalidatePath("/admin/invitations");
    revalidatePath("/admin/users");
    return { ok: `${email} に招待メールを送信しました。`, requestId };
  } catch (e) {
    return handleError(e, requestId);
  }
}

export async function resendInvitationAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const invitationId = String(formData.get("invitation_id") ?? "");
    if (!UUID_RE.test(invitationId)) return err("対象の招待が不正です。", requestId);

    const result = await resendInvitation(invitationId);
    if (!result) return err("この招待は再送できません（既にclaim済みか取消済み）。", requestId);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${siteUrl}/login?invite=${encodeURIComponent(result.rawToken)}&next=/tools/photo-colorize`;
    const mail = await sendInvitationEmail({
      toEmail: result.invitation.emailLower,
      displayName: result.invitation.displayName,
      inviteUrl,
    });

    await writeAuditOnly({
      adminUserId: admin.uid,
      action: "invitation_resent",
      targetUserId: null,
      afterData: { invitationId, mailSent: mail.ok },
      requestId,
      ...auditContext(),
    });

    if (!mail.ok) {
      await markInvitationDeliveryFailed(invitationId);
      return err("再送メールの送信に失敗しました。時間をおいて再度お試しください。", requestId);
    }
    revalidatePath("/admin/invitations");
    return { ok: "招待メールを再送しました。", requestId };
  } catch (e) {
    return handleError(e, requestId);
  }
}

export async function revokeInvitationAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const invitationId = String(formData.get("invitation_id") ?? "");
    if (!UUID_RE.test(invitationId)) return err("対象の招待が不正です。", requestId);
    const ok = await revokeInvitation(invitationId);
    if (!ok) return err("この招待は取消できません。", requestId);
    await writeAuditOnly({
      adminUserId: admin.uid,
      action: "invitation_revoked",
      targetUserId: null,
      afterData: { invitationId },
      requestId,
      ...auditContext(),
    });
    revalidatePath("/admin/invitations");
    return { ok: "招待を取り消しました。", requestId };
  } catch (e) {
    return handleError(e, requestId);
  }
}

// ─────────────────────────────────────────────
// メンバー更新
// ─────────────────────────────────────────────
export async function updateMemberAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const requestId = newRequestId();
  try {
    const admin = await requireAdmin();
    const uid = String(formData.get("uid") ?? "");
    if (!UUID_RE.test(uid)) return err("対象ユーザーが不正です。", requestId);

    const before = await getMember(uid);
    if (!before) return err("対象ユーザーが見つかりません。", requestId);

    const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 100);
    const notes = String(formData.get("notes") ?? "").slice(0, 2000);
    const role = String(formData.get("role") ?? before.role) as UserRole;
    const accountStatus = String(formData.get("account_status") ?? before.accountStatus) as AccountStatus;
    const contractStatus = String(formData.get("contract_status") ?? before.contractStatus) as ContractStatus;

    if (!ROLES.includes(role) || !ACCOUNT_STATUSES.includes(accountStatus) || !CONTRACT_STATUSES.includes(contractStatus)) {
      return err("入力値が不正です。", requestId);
    }
    // 自分自身のrole・アカウント状態は変更不可（誤操作防止）
    if (uid === admin.uid && (role !== "admin" || accountStatus !== "active")) {
      return err("自分自身の権限・アカウント状態は変更できません。", requestId);
    }

    await applyMemberMutation({
      adminUserId: admin.uid,
      targetUid: uid,
      action: "member_updated",
      mutation: { displayName, notes, role, accountStatus, contractStatus },
      requestId,
      ...auditContext(),
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${uid}`);
    return { ok: "更新しました。", requestId };
  } catch (e) {
    return handleError(e, requestId);
  }
}

async function changeStatus(
  formData: FormData,
  to: AccountStatus,
  action: string,
  requestId: string
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const uid = String(formData.get("uid") ?? "");
  if (!UUID_RE.test(uid)) return err("対象ユーザーが不正です。", requestId);
  if (uid === admin.uid) return err("自分自身のアカウント状態は変更できません。", requestId);
  await applyMemberMutation({
    adminUserId: admin.uid,
    targetUid: uid,
    action,
    mutation: { accountStatus: to },
    requestId,
    ...auditContext(),
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${uid}`);
  return {
    ok: to === "active" ? "利用を再開しました。" : to === "suspended" ? "利用を停止しました。" : "削除（無効化）しました。",
    requestId,
  };
}

export async function suspendMemberAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const requestId = newRequestId();
  try {
    return await changeStatus(formData, "suspended", "member_suspended", requestId);
  } catch (e) {
    return handleError(e, requestId);
  }
}

export async function reactivateMemberAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const requestId = newRequestId();
  try {
    return await changeStatus(formData, "active", "member_reactivated", requestId);
  } catch (e) {
    return handleError(e, requestId);
  }
}

export async function softDeleteMemberAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const requestId = newRequestId();
  try {
    if (String(formData.get("confirm") ?? "") !== "true") {
      return err("削除の確認が行われていません。", requestId);
    }
    return await changeStatus(formData, "deleted", "member_deleted", requestId);
  } catch (e) {
    return handleError(e, requestId);
  }
}
