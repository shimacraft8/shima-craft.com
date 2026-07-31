import "server-only";
import { countDocs, getDoc, runQuery, type WhereFilter } from "@/lib/firebase/rest/firestore";
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

/**
 * Firestoreで文字列の前方一致範囲を作る際の終端サフィックス（Firestore公式の慣用句）。
 * `startAt(prefix)` と組み合わせ、`endAt(prefix + PREFIX_RANGE_SUFFIX)` とすることで
 * 「prefixで始まる全ての文字列」を範囲として表現する。単に `endAt(prefix)` にすると
 * 開始値と終了値が同じになり、実質的に完全一致でしか検索できなくなる（過去の不具合）。
 */
const PREFIX_RANGE_SUFFIX = String.fromCharCode(0xf8ff);

function prefixRangeEnd(prefix: string): string {
  return `${prefix}${PREFIX_RANGE_SUFFIX}`;
}

/**
 * カーソルdocIdから、指定orderByフィールドの値を取得する
 * （Admin SDKの `.startAfter(docSnapshot)` が内部でクエリの並び替えフィールドの値を
 *  抽出するのと同じ役割）。カーソルdocが存在しない場合はundefined（カーソル無効時と同義）。
 */
async function cursorFieldValue(
  collectionId: string,
  cursorDocId: string | null | undefined,
  orderByField: string
): Promise<unknown> {
  if (!cursorDocId) return undefined;
  const doc = await getDoc(collectionId, cursorDocId);
  return doc ? doc.data[orderByField] : undefined;
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
  const where: WhereFilter[] = [];
  if (params.role) where.push({ field: "role", op: "EQUAL", value: params.role });
  if (params.accountStatus) where.push({ field: "accountStatus", op: "EQUAL", value: params.accountStatus });
  if (params.contractStatus) where.push({ field: "contractStatus", op: "EQUAL", value: params.contractStatus });

  // 検索はメール前方一致（emailLower）。指定時は createdAt 並びではなく emailLower 並び。
  const search = (params.search ?? "").trim().toLowerCase();
  const orderByField = search ? "emailLower" : "createdAt";
  const startAfterValue = await cursorFieldValue(COLLECTIONS.members, params.cursor, orderByField);

  const docs = await runQuery({
    collectionId: COLLECTIONS.members,
    where: where.length > 0 ? where : undefined,
    orderBy: { field: orderByField, direction: search ? "ASCENDING" : "DESCENDING" },
    startAtValue: search ? search : undefined,
    endAtValue: search ? prefixRangeEnd(search) : undefined,
    startAfterValue,
    limit: pageSize + 1,
  });

  const page = docs.slice(0, pageSize);
  return {
    items: page.map((d) => mapMember(d.id, d.data)),
    nextCursor: docs.length > pageSize ? page[page.length - 1].id : null,
  };
}

// ─── invitations ───
export async function listInvitations(params: {
  status?: Invitation["status"];
  cursor?: string | null;
  pageSize?: number;
}): Promise<Page<Invitation>> {
  const pageSize = Math.min(100, params.pageSize ?? 30);
  const where: WhereFilter[] = [];
  if (params.status) where.push({ field: "status", op: "EQUAL", value: params.status });
  const startAfterValue = await cursorFieldValue(COLLECTIONS.invitations, params.cursor, "createdAt");

  const docs = await runQuery({
    collectionId: COLLECTIONS.invitations,
    where: where.length > 0 ? where : undefined,
    orderBy: { field: "createdAt", direction: "DESCENDING" },
    startAfterValue,
    limit: pageSize + 1,
  });

  const page = docs.slice(0, pageSize);
  return {
    items: page.map((d) => mapInvitation(d.id, d.data)),
    nextCursor: docs.length > pageSize ? page[page.length - 1].id : null,
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
  const where: WhereFilter[] = [];
  if (params.userId) where.push({ field: "userId", op: "EQUAL", value: params.userId });
  if (params.result === "succeeded") where.push({ field: "eventType", op: "EQUAL", value: "colorize_succeeded" });
  else if (params.result === "failed") where.push({ field: "eventType", op: "EQUAL", value: "colorize_failed" });
  else if (params.eventType) where.push({ field: "eventType", op: "EQUAL", value: params.eventType });
  if (params.processingMode) where.push({ field: "processingMode", op: "EQUAL", value: params.processingMode });

  const startAfterValue = await cursorFieldValue(COLLECTIONS.logs, params.cursor, "createdAt");

  const docs = await runQuery({
    collectionId: COLLECTIONS.logs,
    where: where.length > 0 ? where : undefined,
    orderBy: { field: "createdAt", direction: "DESCENDING" },
    startAfterValue,
    limit: pageSize + 1,
  });

  let page = docs.slice(0, pageSize).map((d) => ({ id: d.id, log: mapLog(d.id, d.data) }));
  // errorCode 部分一致はアプリ側で追加フィルタ（indexを増やさない）
  if (params.errorCode) {
    const needle = params.errorCode.toLowerCase();
    page = page.filter((x) => (x.log.errorCode ?? "").toLowerCase().includes(needle));
  }
  return {
    items: page.map((x) => x.log),
    nextCursor: docs.length > pageSize ? docs[pageSize - 1].id : null,
  };
}

// ─── audit ───
export async function listAuditLogs(params: {
  action?: string;
  cursor?: string | null;
  pageSize?: number;
}): Promise<Page<AdminAuditLog>> {
  const pageSize = Math.min(100, params.pageSize ?? 50);
  const where: WhereFilter[] = [];
  if (params.action) where.push({ field: "action", op: "EQUAL", value: params.action });
  const startAfterValue = await cursorFieldValue(COLLECTIONS.audit, params.cursor, "createdAt");

  const docs = await runQuery({
    collectionId: COLLECTIONS.audit,
    where: where.length > 0 ? where : undefined,
    orderBy: { field: "createdAt", direction: "DESCENDING" },
    startAfterValue,
    limit: pageSize + 1,
  });

  const page = docs.slice(0, pageSize);
  return {
    items: page.map((d) => mapAudit(d.id, d.data)),
    nextCursor: docs.length > pageSize ? page[page.length - 1].id : null,
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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeUsers, paymentPending, suspended, todayStarted, todaySucceeded, todayFailed] = await Promise.all([
    countDocs({ collectionId: COLLECTIONS.members, where: [{ field: "accountStatus", op: "EQUAL", value: "active" }] }),
    countDocs({ collectionId: COLLECTIONS.members, where: [{ field: "contractStatus", op: "EQUAL", value: "payment_pending" }] }),
    countDocs({ collectionId: COLLECTIONS.members, where: [{ field: "accountStatus", op: "EQUAL", value: "suspended" }] }),
    countDocs({
      collectionId: COLLECTIONS.logs,
      where: [
        { field: "eventType", op: "EQUAL", value: "colorize_started" },
        { field: "createdAt", op: "GREATER_THAN_OR_EQUAL", value: todayStart },
      ],
    }),
    countDocs({
      collectionId: COLLECTIONS.logs,
      where: [
        { field: "eventType", op: "EQUAL", value: "colorize_succeeded" },
        { field: "createdAt", op: "GREATER_THAN_OR_EQUAL", value: todayStart },
      ],
    }),
    countDocs({
      collectionId: COLLECTIONS.logs,
      where: [
        { field: "eventType", op: "EQUAL", value: "colorize_failed" },
        { field: "createdAt", op: "GREATER_THAN_OR_EQUAL", value: todayStart },
      ],
    }),
  ]);

  return { activeUsers, paymentPending, suspended, todayStarted, todaySucceeded, todayFailed };
}

export async function getRecentLogs(limit = 10): Promise<ColorizationLog[]> {
  const docs = await runQuery({
    collectionId: COLLECTIONS.logs,
    orderBy: { field: "createdAt", direction: "DESCENDING" },
    limit,
  });
  return docs.map((d) => mapLog(d.id, d.data));
}

/** userIdの集合から表示名・メールを引く（ログ画面のユーザー表示用）。 */
export async function resolveMemberLabels(
  userIds: string[]
): Promise<Map<string, { displayName: string; email: string }>> {
  const map = new Map<string, { displayName: string; email: string }>();
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  await Promise.all(
    unique.map(async (uid) => {
      const doc = await getDoc(COLLECTIONS.members, uid);
      if (doc) {
        map.set(uid, {
          displayName: (doc.data.displayName as string) ?? "",
          email: (doc.data.email as string) ?? "",
        });
      }
    })
  );
  return map;
}

export async function findMemberIdsBySearch(search: string): Promise<string[]> {
  const s = search.trim().toLowerCase();
  if (!s) return [];
  const docs = await runQuery({
    collectionId: COLLECTIONS.members,
    orderBy: { field: "emailLower", direction: "ASCENDING" },
    startAtValue: s,
    endAtValue: prefixRangeEnd(s),
    limit: 50,
  });
  return docs.map((d) => d.id);
}

export { MEMBERSHIP_CONFIG_DOC };
