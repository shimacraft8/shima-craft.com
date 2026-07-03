import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, MEMBERSHIP_CONFIG_DOC, mapInvitation } from "./repo";
import {
  generateInvitationToken,
  hashEmail,
  hashToken,
  newInvitationId,
} from "./tokens";
import type { AccountStatus, ContractStatus, Invitation, UserRole } from "./types";

export const INVITATION_TTL_DAYS = 14;

export type CreateInvitationInput = {
  emailLower: string;
  displayName: string;
  role: UserRole;
  accountStatus: AccountStatus;
  contractStatus: ContractStatus;
  createdBy: string;
};

/**
 * 招待を作成し、raw token（メールリンク用・Firestore未保存）を返す。
 * 同一メールの未使用(pending)招待が既にあれば失効させてから作り直す。
 */
export async function createInvitation(
  input: CreateInvitationInput
): Promise<{ invitation: Invitation; rawToken: string }> {
  const db = adminDb();
  const rawToken = generateInvitationToken();
  const id = newInvitationId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  // 既存pendingを失効
  const existing = await db
    .collection(COLLECTIONS.invitations)
    .where("emailLower", "==", input.emailLower)
    .where("status", "==", "pending")
    .get();
  const batch = db.batch();
  existing.forEach((doc) => batch.update(doc.ref, { status: "revoked" }));
  await batch.commit();

  const data = {
    emailLower: input.emailLower,
    emailHash: hashEmail(input.emailLower),
    tokenHash: hashToken(rawToken),
    role: input.role,
    accountStatus: input.accountStatus,
    contractStatus: input.contractStatus,
    displayName: input.displayName,
    status: "pending" as const,
    expiresAt,
    createdBy: input.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    claimedBy: null,
    claimedAt: null,
    resentAt: null,
  };
  await db.collection(COLLECTIONS.invitations).doc(id).set(data);
  const snap = await db.collection(COLLECTIONS.invitations).doc(id).get();
  return { invitation: mapInvitation(id, snap.data()!), rawToken };
}

/** raw token から招待を引く（存在すればInvitationとdocId）。 */
export async function findInvitationByToken(
  rawToken: string
): Promise<{ id: string; invitation: Invitation } | null> {
  const q = await adminDb()
    .collection(COLLECTIONS.invitations)
    .where("tokenHash", "==", hashToken(rawToken))
    .limit(1)
    .get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { id: doc.id, invitation: mapInvitation(doc.id, doc.data()) };
}

export class InvitationError extends Error {
  code:
    | "NOT_FOUND"
    | "EXPIRED"
    | "REVOKED"
    | "ALREADY_CLAIMED"
    | "EMAIL_MISMATCH"
    | "ALREADY_MEMBER";
  constructor(code: InvitationError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "InvitationError";
  }
}

/**
 * 招待をclaimしてmemberを作成する（transaction）。
 * - Googleのverified emailと招待メールの完全一致を要求
 * - member作成 + invitation claimed + adminCount更新を原子的に実行
 */
export async function claimInvitation(params: {
  invitationId: string;
  uid: string;
  googleEmail: string;
  displayName: string;
}): Promise<{ role: UserRole }> {
  const db = adminDb();
  const invRef = db.collection(COLLECTIONS.invitations).doc(params.invitationId);
  const memberRef = db.collection(COLLECTIONS.members).doc(params.uid);
  const configRef = db.collection(COLLECTIONS.systemConfig).doc(MEMBERSHIP_CONFIG_DOC);
  const emailLower = params.googleEmail.toLowerCase();

  return db.runTransaction(async (tx) => {
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists) throw new InvitationError("NOT_FOUND", "invitation not found");
    const inv = mapInvitation(invSnap.id, invSnap.data()!);

    if (inv.status === "claimed") throw new InvitationError("ALREADY_CLAIMED", "already claimed");
    if (inv.status === "revoked") throw new InvitationError("REVOKED", "revoked");
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      throw new InvitationError("EXPIRED", "expired");
    }
    if (inv.emailLower !== emailLower) {
      throw new InvitationError("EMAIL_MISMATCH", "email mismatch");
    }

    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists && (memberSnap.data()!.accountStatus ?? "") !== "deleted") {
      // 既に有効memberなら二重claimを防ぐ（招待だけclaimedにして終了）
      tx.update(invRef, {
        status: "claimed",
        claimedBy: params.uid,
        claimedAt: FieldValue.serverTimestamp(),
      });
      return { role: (memberSnap.data()!.role as UserRole) ?? "user" };
    }

    const willBeAdmin = inv.role === "admin" && inv.accountStatus === "active";

    tx.set(memberRef, {
      email: params.googleEmail,
      emailLower,
      displayName: params.displayName || inv.displayName || "",
      role: inv.role,
      accountStatus: inv.accountStatus,
      contractStatus: inv.contractStatus,
      notes: "",
      lastLoginAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      deletedAt: null,
      authDisabledAt: null,
    });

    tx.update(invRef, {
      status: "claimed",
      claimedBy: params.uid,
      claimedAt: FieldValue.serverTimestamp(),
    });

    if (willBeAdmin) {
      tx.set(
        configRef,
        { adminCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    return { role: inv.role };
  });
}

export async function resendInvitation(invitationId: string): Promise<{ invitation: Invitation; rawToken: string } | null> {
  const db = adminDb();
  const ref = db.collection(COLLECTIONS.invitations).doc(invitationId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const inv = mapInvitation(snap.id, snap.data()!);
  if (inv.status === "claimed" || inv.status === "revoked") return null;

  // 新しいtokenを発行し直す（古いリンクは無効化）
  const rawToken = generateInvitationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await ref.update({
    tokenHash: hashToken(rawToken),
    status: "pending",
    expiresAt,
    resentAt: FieldValue.serverTimestamp(),
  });
  const fresh = await ref.get();
  return { invitation: mapInvitation(ref.id, fresh.data()!), rawToken };
}

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const ref = adminDb().collection(COLLECTIONS.invitations).doc(invitationId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const inv = mapInvitation(snap.id, snap.data()!);
  if (inv.status === "claimed") return false;
  await ref.update({ status: "revoked" });
  return true;
}

export async function markInvitationDeliveryFailed(invitationId: string): Promise<void> {
  await adminDb().collection(COLLECTIONS.invitations).doc(invitationId).update({
    status: "delivery_failed",
  });
}
