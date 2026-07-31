import "server-only";
import { getServiceAccountAccessToken } from "./googleAuth";
import { assertOk, fetchWithTimeout, GoogleApiError } from "./httpClient";
import {
  decodeFields,
  encodeValue,
  splitFieldsAndTransforms,
  type FirestoreRestValue,
} from "./firestoreValues";

/**
 * Firestore REST API の薄いクライアント（Cloudflare Workers対応）。
 * firebase-admin/firestore（gRPC/protobufjs、Workersでは動作しない）の代替。
 *
 * 設計方針:
 * - 全呼び出しはサービスアカウントOAuth2で実行する（現行のAdmin SDKと同じ信頼境界）。
 *   Security Rules（deny-all）はこれまで通りバイパスされる前提であり、変更しない。
 *   認可（本人確認・admin判定）は必ず呼び出し側のアプリコードで事前に行うこと。
 * - 操作可能なコレクションを ALLOWED_COLLECTIONS に明示的に限定する（意図しないパス操作の防止）。
 *   lib/members/repo.ts の COLLECTIONS と値は一致させるが、あえて独立した定数として持つ
 *   （どちらか一方の変更だけでは操作範囲が広がらないようにする多重防御）。
 * - 秘密情報・レスポンス本文はログにも例外メッセージにも出さない（httpClient.tsの方針を踏襲）。
 */

const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore" as const;

const ALLOWED_COLLECTIONS = new Set([
  "members",
  "invitations",
  "colorizationExecutions",
  "colorizationLogs",
  "adminAuditLogs",
  "systemConfig",
]);

function assertAllowedCollection(collectionId: string): void {
  if (!ALLOWED_COLLECTIONS.has(collectionId)) {
    throw new Error(`Firestore REST client: collection "${collectionId}" is not allowed`);
  }
}

function assertValidDocId(docId: string): void {
  if (!docId || docId.includes("/") || docId === "." || docId === "..") {
    throw new Error("Firestore REST client: invalid document id");
  }
}

function projectId(): string {
  const id = process.env.FIREBASE_PROJECT_ID;
  if (!id) throw new Error("FIREBASE_PROJECT_ID is not configured");
  return id;
}

function documentsBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}

function fullDocName(collectionId: string, docId: string): string {
  return `projects/${projectId()}/databases/(default)/documents/${collectionId}/${docId}`;
}

async function authorizedFetch(url: string, init: RequestInit): Promise<Response> {
  const accessToken = await getServiceAccountAccessToken([FIRESTORE_SCOPE]);
  return fetchWithTimeout(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// ─── Read: 単一ドキュメント取得 ───

export type FirestoreDoc = { id: string; data: Record<string, unknown> };

type RawDocument = { name: string; fields?: Record<string, FirestoreRestValue> };

function docIdFromName(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1];
}

/** 単一ドキュメントを取得する。存在しない場合は null（エラーにしない)。 */
export async function getDoc(
  collectionId: string,
  docId: string,
  opts?: { transactionId?: string }
): Promise<FirestoreDoc | null> {
  assertAllowedCollection(collectionId);
  assertValidDocId(docId);

  const url = new URL(`${documentsBaseUrl()}/${collectionId}/${docId}`);
  if (opts?.transactionId) url.searchParams.set("transaction", opts.transactionId);

  const res = await authorizedFetch(url.toString(), { method: "GET" });
  if (res.status === 404) return null;
  assertOk(res, `Firestore getDoc(${collectionId})`);

  const json = (await res.json()) as RawDocument;
  return { id: docIdFromName(json.name), data: decodeFields(json.fields) };
}

// ─── Query ───

export type WhereFilter =
  | { field: string; op: "EQUAL"; value: unknown }
  | { field: string; op: "GREATER_THAN_OR_EQUAL"; value: unknown };

export type OrderBy = { field: string; direction: "ASCENDING" | "DESCENDING" };

export type QueryOptions = {
  collectionId: string;
  where?: WhereFilter[];
  orderBy: OrderBy;
  /** startAt(value) 相当（inclusive）。startAfterValueが同時指定された場合はそちらを優先する（Query builderの「後勝ち」を再現）。 */
  startAtValue?: unknown;
  /** startAfter(value) 相当（exclusive）。ページネーションのカーソル用。 */
  startAfterValue?: unknown;
  /** endAt(value) 相当（inclusive）。 */
  endAtValue?: unknown;
  limit: number;
  transactionId?: string;
};

function buildFieldFilter(w: WhereFilter) {
  return {
    fieldFilter: {
      field: { fieldPath: w.field },
      op: w.op,
      value: encodeValue(w.value),
    },
  };
}

function buildWhere(filters: WhereFilter[] | undefined) {
  if (!filters || filters.length === 0) return undefined;
  if (filters.length === 1) return buildFieldFilter(filters[0]);
  return {
    compositeFilter: {
      op: "AND" as const,
      filters: filters.map(buildFieldFilter),
    },
  };
}

type RunQueryResponseItem = { document?: RawDocument };

/** structuredQueryを実行し、デコード済みドキュメントの配列を返す。 */
export async function runQuery(options: QueryOptions): Promise<FirestoreDoc[]> {
  assertAllowedCollection(options.collectionId);

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId: options.collectionId }],
    orderBy: [{ field: { fieldPath: options.orderBy.field }, direction: options.orderBy.direction }],
    limit: options.limit,
  };
  const where = buildWhere(options.where);
  if (where) structuredQuery.where = where;

  if (options.startAfterValue !== undefined) {
    structuredQuery.startAt = { values: [encodeValue(options.startAfterValue)], before: false };
  } else if (options.startAtValue !== undefined) {
    structuredQuery.startAt = { values: [encodeValue(options.startAtValue)], before: true };
  }
  if (options.endAtValue !== undefined) {
    structuredQuery.endAt = { values: [encodeValue(options.endAtValue)], before: false };
  }

  const body: Record<string, unknown> = { structuredQuery };
  if (options.transactionId) body.transaction = options.transactionId;

  const res = await authorizedFetch(`${documentsBaseUrl()}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assertOk(res, `Firestore runQuery(${options.collectionId})`);

  const items = (await res.json()) as RunQueryResponseItem[];
  return items
    .filter((item) => item.document)
    .map((item) => ({
      id: docIdFromName(item.document!.name),
      data: decodeFields(item.document!.fields),
    }));
}

/** count集計クエリ（runAggregationQuery）。 */
export async function countDocs(params: { collectionId: string; where?: WhereFilter[] }): Promise<number> {
  assertAllowedCollection(params.collectionId);

  const structuredQuery: Record<string, unknown> = { from: [{ collectionId: params.collectionId }] };
  const where = buildWhere(params.where);
  if (where) structuredQuery.where = where;

  const body = {
    structuredAggregationQuery: {
      structuredQuery,
      aggregations: [{ alias: "count", count: {} }],
    },
  };

  const res = await authorizedFetch(`${documentsBaseUrl()}:runAggregationQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assertOk(res, `Firestore countDocs(${params.collectionId})`);

  type AggResponseItem = { result?: { aggregateFields?: { count?: { integerValue?: string } } } };
  const items = (await res.json()) as AggResponseItem[];
  const raw = items[0]?.result?.aggregateFields?.count?.integerValue;
  return raw ? Number(raw) : 0;
}

// ─── Write（非transaction・複数doc原子コミット） ───

export type FirestoreWriteOp =
  | { kind: "set"; collectionId: string; docId: string; data: Record<string, unknown>; merge?: boolean }
  | { kind: "update"; collectionId: string; docId: string; data: Record<string, unknown> }
  | { kind: "delete"; collectionId: string; docId: string };

/** FirestoreWriteOp → REST の Write オブジェクトへ変換する。 */
export function buildWrite(op: FirestoreWriteOp): Record<string, unknown> {
  assertAllowedCollection(op.collectionId);
  assertValidDocId(op.docId);

  if (op.kind === "delete") {
    return { delete: fullDocName(op.collectionId, op.docId) };
  }

  const { fields, fieldTransforms } = splitFieldsAndTransforms(op.data);
  const write: Record<string, unknown> = {
    update: { name: fullDocName(op.collectionId, op.docId), fields },
  };

  if (op.kind === "set" && op.merge) {
    write.updateMask = { fieldPaths: Object.keys(op.data).filter((k) => op.data[k] !== undefined) };
  } else if (op.kind === "update") {
    write.updateMask = { fieldPaths: Object.keys(op.data).filter((k) => op.data[k] !== undefined) };
    write.currentDocument = { exists: true };
  }
  // op.kind === "set" && !op.merge: updateMaskを付けない = ドキュメント全体を置き換える

  if (fieldTransforms.length > 0) write.updateTransforms = fieldTransforms;
  return write;
}

async function commitRaw(writes: Record<string, unknown>[], transactionId?: string): Promise<void> {
  const body: Record<string, unknown> = { writes };
  if (transactionId) body.transaction = transactionId;

  const res = await authorizedFetch(`${documentsBaseUrl()}:commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assertOk(res, "Firestore commit");
}

/** 複数の書き込みを1回のcommitで原子的に適用する（db.batch().commit()相当、読み取りを伴わない）。 */
export async function commitWrites(ops: FirestoreWriteOp[]): Promise<void> {
  if (ops.length === 0) return;
  await commitRaw(ops.map(buildWrite));
}

// ─── Transaction ───

export class FirestoreTransactionConflictError extends GoogleApiError {
  constructor() {
    super(409, "unknown", "Firestore transaction commit aborted (conflict)");
    this.name = "FirestoreTransactionConflictError";
  }
}

export type FirestoreTransactionHandle = {
  get(collectionId: string, docId: string): Promise<FirestoreDoc | null>;
  set(collectionId: string, docId: string, data: Record<string, unknown>, opts?: { merge?: boolean }): void;
  update(collectionId: string, docId: string, data: Record<string, unknown>): void;
  delete(collectionId: string, docId: string): void;
};

async function beginTransaction(): Promise<string> {
  const res = await authorizedFetch(`${documentsBaseUrl()}:beginTransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ options: { readWrite: {} } }),
  });
  assertOk(res, "Firestore beginTransaction");
  const json = (await res.json()) as { transaction: string };
  return json.transaction;
}

async function rollbackSafely(transactionId: string): Promise<void> {
  try {
    const res = await authorizedFetch(`${documentsBaseUrl()}:rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: transactionId }),
    });
    // rollback自体の失敗は無視する(Firestore側でtransactionはいずれ自然失効する)。
    void res;
  } catch {
    // 同上。呼び出し元の本来のエラー/結果を優先する。
  }
}

function buildTxHandle(transactionId: string, writes: FirestoreWriteOp[]): FirestoreTransactionHandle {
  return {
    get: (collectionId, docId) => getDoc(collectionId, docId, { transactionId }),
    set: (collectionId, docId, data, opts) => {
      writes.push({ kind: "set", collectionId, docId, data, merge: opts?.merge });
    },
    update: (collectionId, docId, data) => {
      writes.push({ kind: "update", collectionId, docId, data });
    },
    delete: (collectionId, docId) => {
      writes.push({ kind: "delete", collectionId, docId });
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Firestore transaction（beginTransaction → 読み取り → commit）を実行する。
 * commit時にHTTP 409（競合/ABORTED相当）が返った場合のみ、上限付き指数バックオフ+ジッターで
 * 全体（fn自体）を再実行する。fn自身が投げたアプリケーションエラー（業務上の拒否）は
 * リトライせず、rollbackしてそのまま呼び出し元へ伝播する。
 */
export async function runFirestoreTransaction<T>(
  fn: (tx: FirestoreTransactionHandle) => Promise<T>,
  opts?: { maxAttempts?: number }
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 5;
  let delayMs = 100;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const transactionId = await beginTransaction();
    const writes: FirestoreWriteOp[] = [];
    const tx = buildTxHandle(transactionId, writes);

    let result: T;
    try {
      result = await fn(tx);
    } catch (err) {
      await rollbackSafely(transactionId);
      throw err;
    }

    try {
      if (writes.length > 0) {
        await commitRaw(writes.map(buildWrite), transactionId);
      } else {
        // 読み取りのみのtransactionでも明示的にcommitしてロックを解放する。
        await commitRaw([], transactionId);
      }
      return result;
    } catch (err) {
      const isConflict = err instanceof GoogleApiError && err.status === 409;
      if (isConflict && attempt < maxAttempts) {
        const jitter = Math.floor(Math.random() * 50);
        await sleep(delayMs + jitter);
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
  // maxAttempts>=1が保証されている限りここには到達しない。
  throw new Error("Firestore transaction: exhausted retries without a result");
}

// ─── 新規ドキュメントID生成（db.collection().doc() 相当） ───

const AUTO_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Firestoreのauto-idと同形式（20文字のランダムID）をクライアント側で生成する（ネットワーク不要）。 */
export function newDocId(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < 20; i++) id += AUTO_ID_CHARS[bytes[i] % AUTO_ID_CHARS.length];
  return id;
}

export { ALLOWED_COLLECTIONS };
