import "server-only";
import type { Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  COLLECTIONS,
  MEMBERSHIP_CONFIG_DOC,
  mapAudit,
  mapInvitation,
  mapLog,
  mapMember,
} from "./repo";
import type {
  AccountStatus,
  AdminAuditLog,
  ColorizationLog,
  ContractStatus,
  Invitation,
  Member,
  UserRole,
} from "./types";

/** cursorページネーションの結果。nextCursorは最終docのID。 */
export type Page<T> = { items: T[]; nextCursor: string | null };

async function startAfterDoc(coll: string, cursor: string | null) {
  if (!cursor) return null;
  const snap = await adminDb().collection(coll).doc(cursor).get();
  return snap.exists ? snap : null;
}

// ─── members ───
export async function listMembers(params: {
  role?: UserRole;
  accountStatus?: AccountStatus;
  contractStatus?: ContractStatus;
  search?: string;
  cursor?: string | null;
  pageSize?: number;
}): Promise<Page<Member>> {
  const pageSize = Math.min(100, params.pageSize ?? 20);
  let q: Query = adminDb().collection(COLLECTIONS.members);

  if (params.role) q = q.where("role", "==", params.role);
  if (params.accountStatus) q = q.where("accountStatus", "==", params.accountStatus);
  if (params.contractStatus) q = q.where("contractStatus", "==", params.contractStatus);

  // 検索はメール前方一致（emailLower）。指定時は createdAt 並びではなく emailLower 並び。
  const search = (params.search ?? "").trim().toLowerCase();
  if (search) {
    q = q.orderBy("emailLower").startAt(search).endAt(`${search}`);
  } else {
    q = q.orderBy("createdAt", "desc");
  }

  const after = await startAfterDoc(COLLECTIONS.members, params.cursor ?? null);
  if (after) q = q.startAfter(after);
  q = q.limit(pageSize + 1);

  const snap = await q.get();
  const docs = snap.docs.slice(0, pageSize);
  return {
    items: docs.map((d) => mapMember(d.id, d.data())),
    nextCursor: snap.docs.length > pageSize ? docs[docs.length - 1].id : null,
  };
}

// ─── invitations ───
export async function listInvitations(params: {
  status?: Invitation["status"];
  cursor?: string | null;
  pageSize?: number;
}): Promise<Page<Invitation>> {
  const pageSize = Math.min(100, params.pageSize ?? 30);
  let q: Query = adminDb().collection(COLLECTIONS.invitations);
  if (params.status) q = q.where("status", "==", params.status);
  q = q.orderBy("createdAt", "desc");
  const after = await startAfterDoc(COLLECTIONS.invitations, params.cursor ?? null);
  if (after) q = q.startAfter(after);
  q = q.limit(pageSize + 1);
  const snap = await q.get();
  const docs = snap.docs.slice(0, pageSize);
  return {
    items: docs.map((d) => mapInvitation(d.id, d.data())),
    nextCursor: snap.docs.length > pageSize ? docs[docs.length - 1].id : null,
  };
}

// ─── logs ───
export async function listLogs(params: {
  userId?: string;
  eventType?: string;
  result?: "succeeded" | "failed";
  processingMode?: "webgpu" | "wasm";
  errorCode?: string;
  fromIso?: string;
  toIso?: string;
  cursor?: string | null;
  pageSize?: number;
}): Promise<Page<ColorizationLog>> {
  const pageSize = Math.min(100, params.pageSize ?? 50);
  let q: Query = adminDb().collection(COLLECTIONS.logs);
  if (params.userId) q = q.where("userId", "==", params.userId);
  if (params.result === "succeeded") q = q.where("eventType", "==", "colorize_succeeded");
  else if (params.result === "failed") q = q.where("eventType", "==", "colorize_failed");
  else if (params.eventType) q = q.where("eventType", "==", params.eventType);
  if (params.processingMode) q = q.where("processingMode", "==", params.processingMode);
  q = q.orderBy("createdAt", "desc");
  const after = await startAfterDoc(COLLECTIONS.logs, params.cursor ?? null);
  if (after) q = q.startAfter(after);
  q = q.limit(pageSize + 1);
  const snap = await q.get();
  let docs = snap.docs.slice(0, pageSize).map((d) => ({ id: d.id, log: mapLog(d.id, d.data()) }));
  // errorCode 部分一致はアプリ側で追加フィルタ（indexを増やさない）
  if (params.errorCode) {
    const needle = params.errorCode.toLowerCase();
    docs = docs.filter((x) => (x.log.errorCode ?? "").toLowerCase().includes(needle));
  }
  return {
    items: docs.map((x) => x.log),
    nextCursor: snap.docs.length > pageSize ? snap.docs[pageSize - 1].id : null,
  };
}

// ─── audit ───
export async function listAuditLogs(params: {
  action?: string;
  cursor?: string | null;
  pageSize?: number;
}): Promise<Page<AdminAuditLog>> {
  const pageSize = Math.min(100, params.pageSize ?? 50);
  let q: Query = adminDb().collection(COLLECTIONS.audit);
  if (params.action) q = q.where("action", "==", params.action);
  q = q.orderBy("createdAt", "desc");
  const after = await startAfterDoc(COLLECTIONS.audit, params.cursor ?? null);
  if (after) q = q.startAfter(after);
  q = q.limit(pageSize + 1);
  const snap = await q.get();
  const docs = snap.docs.slice(0, pageSize);
  return {
    items: docs.map((d) => mapAudit(d.id, d.data())),
    nextCursor: snap.docs.length > pageSize ? docs[docs.length - 1].id : null,
  };
}

// ─── dashboard ───
export async function getDashboardStats(): Promise<{
  activeUsers: number;
  paymentPending: number;
  suspended: number;
  todayStarted: number;
  todaySucceeded: number;
  todayFailed: number;
}> {
  const db = adminDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const countQ = async (q: Query) => (await q.count().get()).data().count;

  const [activeUsers, paymentPending, suspended, todayStarted, todaySucceeded, todayFailed] =
    await Promise.all([
      countQ(db.collection(COLLECTIONS.members).where("accountStatus", "==", "active")),
      countQ(db.collection(COLLECTIONS.members).where("contractStatus", "==", "payment_pending")),
      countQ(db.collection(COLLECTIONS.members).where("accountStatus", "==", "suspended")),
      countQ(
        db
          .collection(COLLECTIONS.logs)
          .where("eventType", "==", "colorize_started")
          .where("createdAt", ">=", todayStart)
      ),
      countQ(
        db
          .collection(COLLECTIONS.logs)
          .where("eventType", "==", "colorize_succeeded")
          .where("createdAt", ">=", todayStart)
      ),
      countQ(
        db
          .collection(COLLECTIONS.logs)
          .where("eventType", "==", "colorize_failed")
          .where("createdAt", ">=", todayStart)
      ),
    ]);

  return { activeUsers, paymentPending, suspended, todayStarted, todaySucceeded, todayFailed };
}

export async function getRecentLogs(limit = 10): Promise<ColorizationLog[]> {
  const snap = await adminDb()
    .collection(COLLECTIONS.logs)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => mapLog(d.id, d.data()));
}

/** userIdの集合から表示名・メールを引く（ログ画面のユーザー表示用）。 */
export async function resolveMemberLabels(
  userIds: string[]
): Promise<Map<string, { displayName: string; email: string }>> {
  const map = new Map<string, { displayName: string; email: string }>();
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  await Promise.all(
    unique.map(async (uid) => {
      const snap = await adminDb().collection(COLLECTIONS.members).doc(uid).get();
      if (snap.exists) {
        const d = snap.data()!;
        map.set(uid, { displayName: (d.displayName as string) ?? "", email: (d.email as string) ?? "" });
      }
    })
  );
  return map;
}

export async function findMemberIdsBySearch(search: string): Promise<string[]> {
  const s = search.trim().toLowerCase();
  if (!s) return [];
  const snap = await adminDb()
    .collection(COLLECTIONS.members)
    .orderBy("emailLower")
    .startAt(s)
    .endAt(`${s}`)
    .limit(50)
    .get();
  return snap.docs.map((d) => d.id);
}

export { MEMBERSHIP_CONFIG_DOC };
