import "server-only";
import { runFirestoreTransaction } from "@/lib/firebase/rest/firestore";
import { increment, serverTimestamp } from "@/lib/firebase/rest/firestoreValues";
import { setCustomUserClaims } from "@/lib/firebase/rest/authAdmin";
import { COLLECTIONS, MEMBERSHIP_CONFIG_DOC, getMember, touchLastLogin } from "./repo";
import { claimInvitation, findInvitationByToken } from "./invitations";
import { MAX_AUTH_AGE_SECONDS, type DecodedIdToken } from "@/lib/auth/session";

export type LoginResult =
  | { ok: true; uid: string }
  | { ok: false; reason: "STALE_AUTH" | "NOT_REGISTERED" | "SUSPENDED" | "INVALID_INVITATION" };

/**
 * Google ID Token（検証済み）と任意の招待トークンから、
 * アプリ会員化の可否を判定し、必要ならmember作成/招待claim/初期adminブートストラップを行う。
 * この関数が ok:true を返した場合のみ Session Cookie を発行してよい。
 */
export async function resolveLogin(
  decoded: DecodedIdToken,
  invitationToken: string | null
): Promise<LoginResult> {
  // auth_time が古すぎる場合は再ログインを要求（セッション固定・古いトークン悪用の防止）
  const authTime = typeof decoded.auth_time === "number" ? decoded.auth_time : 0;
  if (Date.now() / 1000 - authTime > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, reason: "STALE_AUTH" };
  }

  const email = decoded.email ?? "";
  const emailVerified = decoded.email_verified === true;
  const displayName = (decoded.name as string) ?? "";

  // 既存member
  const existing = await getMember(decoded.uid);
  if (existing) {
    if (existing.accountStatus !== "active") {
      return { ok: false, reason: "SUSPENDED" };
    }
    await touchLastLogin(decoded.uid);
    return { ok: true, uid: decoded.uid };
  }

  // 新規: Googleのメールが検証済みであることが前提
  if (!email || !emailVerified) {
    return { ok: false, reason: "NOT_REGISTERED" };
  }

  // 招待トークンがあればclaim
  if (invitationToken) {
    const found = await findInvitationByToken(invitationToken);
    if (!found) return { ok: false, reason: "INVALID_INVITATION" };
    try {
      await claimInvitation({
        invitationId: found.id,
        uid: decoded.uid,
        googleEmail: email,
        displayName,
      });
      return { ok: true, uid: decoded.uid };
    } catch {
      return { ok: false, reason: "INVALID_INVITATION" };
    }
  }

  // 初期管理者のブートストラップ（初回のみ・冪等・競合安全）
  const bootstrapped = await tryBootstrapInitialAdmin(decoded.uid, email, displayName);
  if (bootstrapped) return { ok: true, uid: decoded.uid };

  return { ok: false, reason: "NOT_REGISTERED" };
}

/**
 * 初期管理者を安全に作成する。
 * - Google verified email が INITIAL_ADMIN_EMAIL と完全一致
 * - まだ管理者が存在しない（bootstrapCompleted !== true）
 * - transactionでロックを取り、二重実行でも複数adminを作らない
 */
export async function tryBootstrapInitialAdmin(
  uid: string,
  email: string,
  displayName: string
): Promise<boolean> {
  const initialAdmin = (process.env.INITIAL_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!initialAdmin || email.toLowerCase() !== initialAdmin) return false;

  const created = await runFirestoreTransaction(async (tx) => {
    const configDoc = await tx.get(COLLECTIONS.systemConfig, MEMBERSHIP_CONFIG_DOC);
    if (configDoc && configDoc.data.bootstrapCompleted === true) {
      return false; // 既にブートストラップ済み
    }
    const memberDoc = await tx.get(COLLECTIONS.members, uid);
    if (memberDoc) return false;

    tx.set(COLLECTIONS.members, uid, {
      email,
      emailLower: email.toLowerCase(),
      displayName: displayName || "SHIMA CRAFT 管理者",
      role: "admin",
      accountStatus: "active",
      contractStatus: "active",
      notes: "初期管理者（bootstrap）",
      lastLoginAt: serverTimestamp(),
      lastUsedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
      authDisabledAt: null,
    });
    tx.set(
      COLLECTIONS.systemConfig,
      MEMBERSHIP_CONFIG_DOC,
      {
        bootstrapCompleted: true,
        adminCount: increment(1),
        schemaVersion: 1,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  });

  if (created) {
    try {
      await setCustomUserClaims(uid, { role: "admin" });
    } catch {
      // claim付与失敗はFirestoreを正とする
    }
  }
  return created;
}
