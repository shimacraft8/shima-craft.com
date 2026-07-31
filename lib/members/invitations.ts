import "server-only";
import { commitWrites, getDoc, runFirestoreTransaction, runQuery } from "@/lib/firebase/rest/firestore";
import { increment, serverTimestamp } from "@/lib/firebase/rest/firestoreValues";
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
  const rawToken = generateInvitationToken();
  const id = newInvitationId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  // 既存pendingを失効
  const existing = await runQuery({
    collectionId: COLLECTIONS.invitations,
    where: [
      { field: "emailLower", op: "EQUAL", value: input.emailLower },
      { field: "status", op: "EQUAL", value: "pending" },
    ],
  });
  if (existing.length > 0) {
    await commitWrites(
      existing.map((doc) => ({
        kind: "update" as const,
        collectionId: COLLECTIONS.invitations,
        docId: doc.id,
        data: { status: "revoked" },
      }))
    );
  }

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
    createdAt: serverTimestamp(),
    claimedBy: null,
    claimedAt: null,
    resentAt: null,
  };
  await commitWrites([{ kind: "set", collectionId: COLLECTIONS.invitations, docId: id, data }]);
  const doc = await getDoc(COLLECTIONS.invitations, id);
  return { invitation: mapInvitation(id, doc!.data), rawToken };
}

/** raw token から招待を引く（存在すればInvitationとdocId）。 */
export async function findInvitationByToken(
  rawToken: string
): Promise<{ id: string; invitation: Invitation } | null> {
  const docs = await runQuery({
    collectionId: COLLECTIONS.invitations,
    where: [{ field: "tokenHash", op: "EQUAL", value: hashToken(rawToken) }],
    limit: 1,
  });
  if (docs.length === 0) return null;
  return { id: docs[0].id, invitation: mapInvitation(docs[0].id, docs[0].data) };
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
  const emailLower = params.googleEmail.toLowerCase();

  return runFirestoreTransaction(async (tx) => {
    const invDoc = await tx.get(COLLECTIONS.invitations, params.invitationId);
    if (!invDoc) throw new InvitationError("NOT_FOUND", "invitation not found");
    const inv = mapInvitation(invDoc.id, invDoc.data);

    if (inv.status === "claimed") throw new InvitationError("ALREADY_CLAIMED", "already claimed");
    if (inv.status === "revoked") throw new InvitationError("REVOKED", "revoked");
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      throw new InvitationError("EXPIRED", "expired");
    }
    if (inv.emailLower !== emailLower) {
      throw new InvitationError("EMAIL_MISMATCH", "email mismatch");
    }

    const memberDoc = await tx.get(COLLECTIONS.members, params.uid);
    if (memberDoc && (memberDoc.data.accountStatus ?? "") !== "deleted") {
      // 既に有効memberなら二重claimを防ぐ（招待だけclaimedにして終了）
      tx.update(COLLECTIONS.invitations, params.invitationId, {
        status: "claimed",
        claimedBy: params.uid,
        claimedAt: serverTimestamp(),
      });
      return { role: (memberDoc.data.role as UserRole) ?? "user" };
    }

    const willBeAdmin = inv.role === "admin" && inv.accountStatus === "active";

    tx.set(COLLECTIONS.members, params.uid, {
      email: params.googleEmail,
      emailLower,
      displayName: params.displayName || inv.displayName || "",
      role: inv.role,
      accountStatus: inv.accountStatus,
      contractStatus: inv.contractStatus,
      notes: "",
      lastLoginAt: serverTimestamp(),
      lastUsedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
      authDisabledAt: null,
    });

    tx.update(COLLECTIONS.invitations, params.invitationId, {
      status: "claimed",
      claimedBy: params.uid,
      claimedAt: serverTimestamp(),
    });

    if (willBeAdmin) {
      tx.set(
        COLLECTIONS.systemConfig,
        MEMBERSHIP_CONFIG_DOC,
        { adminCount: increment(1), updatedAt: serverTimestamp() },
        { merge: true }
      );
    }

    return { role: inv.role };
  });
}

export async function resendInvitation(invitationId: string): Promise<{ invitation: Invitation; rawToken: string } | null> {
  const snap = await getDoc(COLLECTIONS.invitations, invitationId);
  if (!snap) return null;
  const inv = mapInvitation(snap.id, snap.data);
  if (inv.status === "claimed" || inv.status === "revoked") return null;

  // 新しいtokenを発行し直す（古いリンクは無効化）
  const rawToken = generateInvitationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await commitWrites([
    {
      kind: "update",
      collectionId: COLLECTIONS.invitations,
      docId: invitationId,
      data: {
        tokenHash: hashToken(rawToken),
        status: "pending",
        expiresAt,
        resentAt: serverTimestamp(),
      },
    },
  ]);
  const fresh = await getDoc(COLLECTIONS.invitations, invitationId);
  return { invitation: mapInvitation(invitationId, fresh!.data), rawToken };
}

export async function revokeInvitation(invitationId: string): Promise<boolean> {
  const snap = await getDoc(COLLECTIONS.invitations, invitationId);
  if (!snap) return false;
  const inv = mapInvitation(snap.id, snap.data);
  if (inv.status === "claimed") return false;
  await commitWrites([
    { kind: "update", collectionId: COLLECTIONS.invitations, docId: invitationId, data: { status: "revoked" } },
  ]);
  return true;
}

export async function markInvitationDeliveryFailed(invitationId: string): Promise<void> {
  await commitWrites([
    {
      kind: "update",
      collectionId: COLLECTIONS.invitations,
      docId: invitationId,
      data: { status: "delivery_failed" },
    },
  ]);
}
