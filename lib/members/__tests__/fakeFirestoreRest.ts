import { encodeFields, type FirestoreRestValue } from "@/lib/firebase/rest/firestoreValues";

/**
 * lib/firebase/rest/firestore.ts が発行する実際のHTTPリクエスト形状に対して応答する、
 * インメモリの疑似Firestore REST バックエンド。
 *
 * beginTransaction時点のドキュメントversionを記録し、commit時に「そのtransactionが
 * 読んだドキュメントが、他のtransactionのcommitでその後変更されていないか」を検証する
 * （Firestoreの実際の楽観的並行性制御を単純化した近似）。競合時は409を返し、
 * runFirestoreTransaction側のリトライ経路を誘発する。
 *
 * Stage 8で要求される並行テスト（初期admin二重作成防止・最後のadmin保護・
 * 招待の二重claim防止・同時権限更新の整合性）を、モックではなく実際の
 * runFirestoreTransaction実装に対して検証するために使う。
 */

export type StoredDoc = { fields: Record<string, FirestoreRestValue>; version: number };

type Write = {
  update?: { name: string; fields?: Record<string, FirestoreRestValue> };
  updateMask?: { fieldPaths: string[] };
  updateTransforms?: Array<
    { fieldPath: string } & ({ setToServerValue: "REQUEST_TIME" } | { increment: FirestoreRestValue })
  >;
  delete?: string;
};

function pathFromName(name: string): string {
  const marker = "/documents/";
  const idx = name.indexOf(marker);
  return idx >= 0 ? name.slice(idx + marker.length) : name;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

export class FakeFirestoreBackend {
  private docs = new Map<string, StoredDoc>();
  private nextTxnId = 1;
  private txnReads = new Map<string, Map<string, number>>();

  beginCount = 0;
  commitAttempts = 0;
  conflictCount = 0;
  rollbackCount = 0;

  seed(collectionId: string, docId: string, data: Record<string, unknown>): void {
    this.docs.set(`${collectionId}/${docId}`, { fields: encodeFields(data), version: 1 });
  }

  /** テスト用アクセサ: 現在保存されているドキュメント(フィールドはFirestore REST Value形式のまま)を返す。 */
  get(collectionId: string, docId: string): StoredDoc | undefined {
    return this.docs.get(`${collectionId}/${docId}`);
  }

  private applyWrite(write: Write): void {
    if (write.delete) {
      this.docs.delete(pathFromName(write.delete));
      return;
    }
    const path = pathFromName(write.update!.name);
    const existing = this.docs.get(path);
    const fields: Record<string, FirestoreRestValue> = write.updateMask
      ? { ...(existing?.fields ?? {}) }
      : {};
    for (const [k, v] of Object.entries(write.update!.fields ?? {})) {
      if (write.updateMask && !write.updateMask.fieldPaths.includes(k)) continue;
      fields[k] = v;
    }
    for (const t of write.updateTransforms ?? []) {
      if ("setToServerValue" in t) {
        fields[t.fieldPath] = { timestampValue: new Date().toISOString() };
      } else {
        const current = existing?.fields[t.fieldPath];
        const currentNum = current && "integerValue" in current ? Number(current.integerValue) : 0;
        const incValue = t.increment;
        const incBy = "integerValue" in incValue ? Number(incValue.integerValue) : (incValue as { doubleValue: number }).doubleValue;
        fields[t.fieldPath] = { integerValue: String(currentNum + incBy) };
      }
    }
    this.docs.set(path, { fields, version: (existing?.version ?? 0) + 1 });
  }

  async handleFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const u = new URL(url);

    if (u.pathname.endsWith(":beginTransaction")) {
      this.beginCount++;
      const id = String(this.nextTxnId++);
      this.txnReads.set(id, new Map());
      return jsonResponse({ transaction: id });
    }

    if (u.pathname.endsWith(":rollback")) {
      this.rollbackCount++;
      const body = JSON.parse((init.body as string) ?? "{}") as { transaction?: string };
      if (body.transaction) this.txnReads.delete(body.transaction);
      return jsonResponse({});
    }

    if (u.pathname.endsWith(":commit")) {
      this.commitAttempts++;
      const body = JSON.parse((init.body as string) ?? "{}") as { writes: Write[]; transaction?: string };
      if (body.transaction) {
        const reads = this.txnReads.get(body.transaction);
        for (const [path, readVersion] of Array.from(reads?.entries() ?? [])) {
          const currentVersion = this.docs.get(path)?.version ?? 0;
          if (currentVersion !== readVersion) {
            this.conflictCount++;
            return new Response("conflict", { status: 409 });
          }
        }
        this.txnReads.delete(body.transaction);
      }
      for (const w of body.writes) this.applyWrite(w);
      return jsonResponse({});
    }

    if (u.pathname.includes(":runQuery") || u.pathname.includes(":runAggregationQuery")) {
      throw new Error("FakeFirestoreBackend: query endpoints are not implemented (not needed by these tests)");
    }

    // 単純GET（documents/{collection}/{docId}、任意で ?transaction=）
    const path = u.pathname.split("/documents/")[1];
    const doc = this.docs.get(path);
    const txn = u.searchParams.get("transaction");
    if (txn) {
      const reads = this.txnReads.get(txn) ?? new Map();
      reads.set(path, doc?.version ?? 0);
      this.txnReads.set(txn, reads);
    }
    if (!doc) return new Response("not found", { status: 404 });
    return jsonResponse({ name: `projects/test-project/databases/(default)/documents/${path}`, fields: doc.fields });
  }
}
