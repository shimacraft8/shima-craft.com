import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, MEMBERSHIP_CONFIG_DOC, mapMember } from "./repo";
import type {
  AccountStatus,
  ContractStatus,
  Member,
  UserRole,
} from "./types";

/**
 * 管理者による会員変更（Firestore transaction）。
 * - 対象memberの更新と adminAuditLogs の書き込みを同一transactionで行う
 *   （監査ログが書けない操作は成立させない = fail-closed）。
 * - systemConfig/membership.adminCount を用いて「最後の有効adminの降格・停止・削除」を
 *   transaction内で拒否する（競合時も破れない）。
 */

export class MemberOpError extends Error {
  code: "NOT_FOUND" | "LAST_ADMIN" | "SELF_FORBIDDEN" | "INVALID";
  constructor(code: MemberOpError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "MemberOpError";
  }
}

/** role=admin かつ accountStatus=active を「有効admin」として数える。 */
function isCountedAdmin(role: UserRole, status: AccountStatus): boolean {
  return role === "admin" && status === "active";
}

type MemberMutation = {
  role?: UserRole;
  accountStatus?: AccountStatus;
  contractStatus?: ContractStatus;
  displayName?: string;
  notes?: string;
  email?: string;
};

/** 監査ログ用の安全なスナップショット（秘密値は含まれない）。 */
function snapshot(m: Member): Record<string, unknown> {
  return {
    email: m.email,
    displayName: m.displayName,
    role: m.role,
    accountStatus: m.accountStatus,
    contractStatus: m.contractStatus,
    notes: m.notes,
  };
}

export async function applyMemberMutation(params: {
  adminUserId: string;
  targetUid: string;
  action: string;
  mutation: MemberMutation;
  requestId: string;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<Member> {
  const db = adminDb();
  const memberRef = db.collection(COLLECTIONS.members).doc(params.targetUid);
  const configRef = db.collection(COLLECTIONS.systemConfig).doc(MEMBERSHIP_CONFIG_DOC);
  const auditRef = db.collection(COLLECTIONS.audit).doc();

  const updated = await db.runTransaction(async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) throw new MemberOpError("NOT_FOUND", "member not found");
    const before = mapMember(memberSnap.id, memberSnap.data()!);

    const after: Member = {
      ...before,
      role: params.mutation.role ?? before.role,
      accountStatus: params.mutation.accountStatus ?? before.accountStatus,
      contractStatus: params.mutation.contractStatus ?? before.contractStatus,
      displayName: params.mutation.displayName ?? before.displayName,
      notes: params.mutation.notes ?? before.notes,
      email: params.mutation.email ?? before.email,
    };

    // 有効admin数の変化を計算し、0になる遷移を拒否
    const wasAdmin = isCountedAdmin(before.role, before.accountStatus);
    const willBeAdmin = isCountedAdmin(after.role, after.accountStatus);
    let adminDelta = 0;
    if (wasAdmin && !willBeAdmin) adminDelta = -1;
    if (!wasAdmin && willBeAdmin) adminDelta = +1;

    if (adminDelta < 0) {
      const configSnap = await tx.get(configRef);
      const currentCount = (configSnap.exists ? (configSnap.data()!.adminCount as number) : 0) || 0;
      if (currentCount + adminDelta < 1) {
        throw new MemberOpError("LAST_ADMIN", "cannot remove the last active admin");
      }
    }

    const updateData: Record<string, unknown> = {
      role: after.role,
      accountStatus: after.accountStatus,
      contractStatus: after.contractStatus,
      displayName: after.displayName,
      notes: after.notes,
      email: after.email,
      emailLower: after.email.toLowerCase(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (params.mutation.accountStatus === "deleted" && before.accountStatus !== "deleted") {
      updateData.deletedAt = FieldValue.serverTimestamp();
    }
    if (params.mutation.accountStatus && params.mutation.accountStatus !== "active") {
      updateData.authDisabledAt = FieldValue.serverTimestamp();
    }
    if (params.mutation.accountStatus === "active") {
      updateData.authDisabledAt = null;
    }
    tx.set(memberRef, updateData, { merge: true });

    if (adminDelta !== 0) {
      tx.set(
        configRef,
        { adminCount: FieldValue.increment(adminDelta), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    tx.set(auditRef, {
      adminUserId: params.adminUserId,
      action: params.action,
      targetUserId: params.targetUid,
      beforeData: snapshot(before),
      afterData: snapshot(after),
      requestId: params.requestId,
      ipHash: params.ipHash,
      userAgent: params.userAgent,
      createdAt: FieldValue.serverTimestamp(),
    });

    return after;
  });

  // transaction成立後に Firebase Auth 側を同期（DB更新の後・失敗しても致命的でない副作用）
  try {
    if (params.mutation.accountStatus) {
      const disabled = params.mutation.accountStatus !== "active";
      await adminAuth().updateUser(params.targetUid, { disabled });
      // 停止・削除・降格時は既存トークンを失効し、Session Cookieも無効化する
      if (disabled || params.mutation.role === "user") {
        await adminAuth().revokeRefreshTokens(params.targetUid);
      }
    }
    // roleをcustom claimへ補助的に反映（source of truthはFirestore）
    if (params.mutation.role) {
      await adminAuth().setCustomUserClaims(params.targetUid, {
        role: updated.role,
      });
      await adminAuth().revokeRefreshTokens(params.targetUid);
    }
  } catch {
    // Auth同期失敗はDB状態を正とする（次回検証時に反映される）
  }

  return updated;
}

/** 監査ログのみ書き込む（member変更を伴わない操作: 招待作成・再送等）。 */
export async function writeAuditOnly(params: {
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  requestId: string;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<void> {
  await adminDb().collection(COLLECTIONS.audit).add({
    adminUserId: params.adminUserId,
    action: params.action,
    targetUserId: params.targetUserId,
    beforeData: params.beforeData ?? null,
    afterData: params.afterData ?? null,
    requestId: params.requestId,
    ipHash: params.ipHash,
    userAgent: params.userAgent,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export { Timestamp };
