import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleApiError } from "../httpClient";

const ORIGINAL_ENV = { ...process.env };

vi.mock("../googleAuth", () => ({
  getServiceAccountAccessToken: vi.fn(async () => "fake-access-token"),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: "test-project" };
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("getDoc", () => {
  it("returns the decoded document when found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe(
          "https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/members/uid-1"
        );
        return jsonResponse({
          name: "projects/test-project/databases/(default)/documents/members/uid-1",
          fields: { email: { stringValue: "a@example.com" }, role: { stringValue: "user" } },
        });
      })
    );
    const { getDoc } = await import("../firestore");
    const doc = await getDoc("members", "uid-1");
    expect(doc).toEqual({ id: "uid-1", data: { email: "a@example.com", role: "user" } });
  });

  it("returns null (not an error) on 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    const { getDoc } = await import("../firestore");
    expect(await getDoc("members", "missing")).toBeNull();
  });

  it("throws GoogleApiError classified by status for non-404 errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 403 })));
    const { getDoc } = await import("../firestore");
    await expect(getDoc("members", "uid-1")).rejects.toMatchObject({ status: 403, kind: "forbidden" });
  });

  it("propagates timeouts as GoogleApiError(kind=timeout)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("aborted", "TimeoutError");
      })
    );
    const { getDoc } = await import("../firestore");
    await expect(getDoc("members", "uid-1")).rejects.toMatchObject({ kind: "timeout" });
  });

  it("passes the transaction query param when given a transactionId", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return new Response("not found", { status: 404 });
      })
    );
    const { getDoc } = await import("../firestore");
    await getDoc("members", "uid-1", { transactionId: "txn-abc" });
    expect(capturedUrl).toContain("?transaction=txn-abc");
  });

  it("rejects a collection not in the allowlist without making a network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getDoc } = await import("../firestore");
    await expect(getDoc("not_a_real_collection", "x")).rejects.toThrow(/not allowed/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a document id containing a path separator (traversal guard)", async () => {
    const { getDoc } = await import("../firestore");
    await expect(getDoc("members", "a/b")).rejects.toThrow(/invalid document id/i);
  });

  it("always authenticates with the service-account bearer token, never a caller-supplied one", async () => {
    let capturedAuth = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedAuth = (init.headers as Record<string, string>).Authorization;
        return new Response("not found", { status: 404 });
      })
    );
    const { getDoc } = await import("../firestore");
    await getDoc("members", "uid-1");
    expect(capturedAuth).toBe("Bearer fake-access-token");
  });
});

describe("Firestore Emulator対応", () => {
  it("uses the emulator's http host and the 'owner' bearer token when FIRESTORE_EMULATOR_HOST is set", async () => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    let capturedUrl = "";
    let capturedAuth = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        capturedUrl = url;
        capturedAuth = (init.headers as Record<string, string>).Authorization;
        return new Response("not found", { status: 404 });
      })
    );
    const { getDoc } = await import("../firestore");
    await getDoc("members", "uid-1");
    expect(capturedUrl).toBe(
      "http://127.0.0.1:8080/v1/projects/test-project/databases/(default)/documents/members/uid-1"
    );
    expect(capturedAuth).toBe("Bearer owner");
  });

  it("does not call getServiceAccountAccessToken (no real credentials needed) in emulator mode", async () => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    const { getServiceAccountAccessToken } = await import("../googleAuth");
    vi.mocked(getServiceAccountAccessToken).mockClear();
    const { getDoc } = await import("../firestore");
    await getDoc("members", "uid-1");
    expect(getServiceAccountAccessToken).not.toHaveBeenCalled();
  });

  it("falls back to the real Google endpoint and real credentials when FIRESTORE_EMULATOR_HOST is unset", async () => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return new Response("not found", { status: 404 });
      })
    );
    const { getDoc } = await import("../firestore");
    await getDoc("members", "uid-1");
    expect(capturedUrl).toBe(
      "https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/members/uid-1"
    );
  });
});

describe("runQuery", () => {
  it("builds a structuredQuery with where/orderBy/limit and decodes returned documents", async () => {
    let capturedBody: unknown = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        expect(url).toBe(
          "https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents:runQuery"
        );
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse([
          {
            document: {
              name: "projects/test-project/databases/(default)/documents/members/uid-1",
              fields: { emailLower: { stringValue: "a@example.com" } },
            },
            readTime: "2026-07-31T00:00:00Z",
          },
          { readTime: "2026-07-31T00:00:00Z" },
        ]);
      })
    );
    const { runQuery } = await import("../firestore");
    const docs = await runQuery({
      collectionId: "members",
      where: [{ field: "role", op: "EQUAL", value: "admin" }],
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      limit: 21,
    });

    expect(docs).toEqual([{ id: "uid-1", data: { emailLower: "a@example.com" } }]);
    expect(capturedBody).toEqual({
      structuredQuery: {
        from: [{ collectionId: "members" }],
        orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
        limit: 21,
        where: { fieldFilter: { field: { fieldPath: "role" }, op: "EQUAL", value: { stringValue: "admin" } } },
      },
    });
  });

  it("combines multiple where clauses into a compositeFilter (AND)", async () => {
    let capturedBody: { structuredQuery?: { where?: unknown } } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse([]);
      })
    );
    const { runQuery } = await import("../firestore");
    await runQuery({
      collectionId: "colorizationLogs",
      where: [
        { field: "eventType", op: "EQUAL", value: "colorize_started" },
        { field: "createdAt", op: "GREATER_THAN_OR_EQUAL", value: new Date("2026-07-31T00:00:00.000Z") },
      ],
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      limit: 10,
    });
    expect(capturedBody.structuredQuery?.where).toEqual({
      compositeFilter: {
        op: "AND",
        filters: [
          { fieldFilter: { field: { fieldPath: "eventType" }, op: "EQUAL", value: { stringValue: "colorize_started" } } },
          {
            fieldFilter: {
              field: { fieldPath: "createdAt" },
              op: "GREATER_THAN_OR_EQUAL",
              value: { timestampValue: "2026-07-31T00:00:00.000Z" },
            },
          },
        ],
      },
    });
  });

  it("startAfterValue takes precedence over startAtValue when both are given (later-cursor-wins semantics)", async () => {
    let capturedBody: { structuredQuery?: { startAt?: unknown } } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse([]);
      })
    );
    const { runQuery } = await import("../firestore");
    await runQuery({
      collectionId: "members",
      orderBy: { field: "emailLower", direction: "ASCENDING" },
      startAtValue: "search-prefix",
      startAfterValue: "cursor-doc-value",
      limit: 21,
    });
    expect(capturedBody.structuredQuery?.startAt).toEqual({
      values: [{ stringValue: "cursor-doc-value" }],
      before: false,
    });
  });

  it("startAtValue alone uses before:true (inclusive), endAtValue uses before:false (inclusive)", async () => {
    let capturedBody: { structuredQuery?: { startAt?: unknown; endAt?: unknown } } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse([]);
      })
    );
    const { runQuery } = await import("../firestore");
    await runQuery({
      collectionId: "members",
      orderBy: { field: "emailLower", direction: "ASCENDING" },
      startAtValue: "abc",
      endAtValue: "abc",
      limit: 21,
    });
    expect(capturedBody.structuredQuery?.startAt).toEqual({ values: [{ stringValue: "abc" }], before: true });
    expect(capturedBody.structuredQuery?.endAt).toEqual({ values: [{ stringValue: "abc" }], before: false });
  });

  it("rejects queries against a disallowed collection", async () => {
    const { runQuery } = await import("../firestore");
    await expect(
      runQuery({ collectionId: "secrets", orderBy: { field: "x", direction: "ASCENDING" }, limit: 1 })
    ).rejects.toThrow(/not allowed/);
  });

  it("omits orderBy from the request when not given (equality-lookup queries without an explicit sort)", async () => {
    let capturedBody: { structuredQuery?: Record<string, unknown> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse([]);
      })
    );
    const { runQuery } = await import("../firestore");
    await runQuery({
      collectionId: "members",
      where: [{ field: "emailLower", op: "EQUAL", value: "a@example.com" }],
      limit: 1,
    });
    expect(capturedBody.structuredQuery).not.toHaveProperty("orderBy");
  });

  it("omits limit from the request when not given (unbounded query)", async () => {
    let capturedBody: { structuredQuery?: Record<string, unknown> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse([]);
      })
    );
    const { runQuery } = await import("../firestore");
    await runQuery({
      collectionId: "invitations",
      where: [
        { field: "emailLower", op: "EQUAL", value: "a@example.com" },
        { field: "status", op: "EQUAL", value: "pending" },
      ],
    });
    expect(capturedBody.structuredQuery).not.toHaveProperty("limit");
  });

  it("throws when a cursor is given without an explicit orderBy (a cursor is meaningless without a sort order)", async () => {
    const { runQuery } = await import("../firestore");
    await expect(
      runQuery({ collectionId: "members", startAtValue: "x", limit: 1 })
    ).rejects.toThrow(/requires an explicit orderBy/);
  });
});

describe("countDocs", () => {
  it("returns the aggregate count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe(
          "https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents:runAggregationQuery"
        );
        return jsonResponse([{ result: { aggregateFields: { count: { integerValue: "7" } } } }]);
      })
    );
    const { countDocs } = await import("../firestore");
    const count = await countDocs({ collectionId: "members", where: [{ field: "accountStatus", op: "EQUAL", value: "active" }] });
    expect(count).toBe(7);
  });

  it("returns 0 when the aggregate result is missing/empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{}])));
    const { countDocs } = await import("../firestore");
    expect(await countDocs({ collectionId: "members" })).toBe(0);
  });
});

describe("commitWrites", () => {
  it("does nothing (no network call) for an empty write list", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { commitWrites } = await import("../firestore");
    await commitWrites([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a plain set (merge:false) omits updateMask (full document replace)", async () => {
    let capturedBody: { writes?: Array<Record<string, unknown>> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({});
      })
    );
    const { commitWrites } = await import("../firestore");
    await commitWrites([{ kind: "set", collectionId: "members", docId: "uid-1", data: { role: "admin" } }]);
    const write = capturedBody.writes![0];
    expect(write.update).toEqual({
      name: "projects/test-project/databases/(default)/documents/members/uid-1",
      fields: { role: { stringValue: "admin" } },
    });
    expect(write.updateMask).toBeUndefined();
  });

  it("a merge set (merge:true) sets updateMask to the provided field paths", async () => {
    let capturedBody: { writes?: Array<Record<string, unknown>> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({});
      })
    );
    const { commitWrites } = await import("../firestore");
    await commitWrites([
      { kind: "set", collectionId: "members", docId: "uid-1", data: { lastLoginAt: "x" }, merge: true },
    ]);
    expect(capturedBody.writes![0].updateMask).toEqual({ fieldPaths: ["lastLoginAt"] });
  });

  it("update requires existence (currentDocument.exists=true) and sets updateMask", async () => {
    let capturedBody: { writes?: Array<Record<string, unknown>> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({});
      })
    );
    const { commitWrites } = await import("../firestore");
    await commitWrites([{ kind: "update", collectionId: "invitations", docId: "inv-1", data: { status: "revoked" } }]);
    const write = capturedBody.writes![0];
    expect(write.currentDocument).toEqual({ exists: true });
    expect(write.updateMask).toEqual({ fieldPaths: ["status"] });
  });

  it("delete produces a delete write with the full document name", async () => {
    let capturedBody: { writes?: Array<Record<string, unknown>> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({});
      })
    );
    const { commitWrites } = await import("../firestore");
    await commitWrites([{ kind: "delete", collectionId: "invitations", docId: "inv-1" }]);
    expect(capturedBody.writes![0].delete).toBe(
      "projects/test-project/databases/(default)/documents/invitations/inv-1"
    );
  });

  it("serverTimestamp/increment sentinels become updateTransforms, not plain fields", async () => {
    let capturedBody: { writes?: Array<Record<string, unknown>> } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({});
      })
    );
    const { commitWrites } = await import("../firestore");
    const { serverTimestamp, increment } = await import("../firestoreValues");
    await commitWrites([
      {
        kind: "set",
        collectionId: "systemConfig",
        docId: "membership",
        data: { adminCount: increment(1), updatedAt: serverTimestamp() },
        merge: true,
      },
    ]);
    const write = capturedBody.writes![0];
    expect(write.updateTransforms).toEqual([
      { fieldPath: "adminCount", increment: { integerValue: "1" } },
      { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
    ]);
  });

  it("commits multiple writes in a single atomic request", async () => {
    let capturedBody: { writes?: unknown[] } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        capturedBody = JSON.parse(init.body as string);
        return jsonResponse({});
      })
    );
    const { commitWrites } = await import("../firestore");
    await commitWrites([
      { kind: "set", collectionId: "colorizationExecutions", docId: "exec-1", data: { status: "started" } },
      { kind: "set", collectionId: "colorizationLogs", docId: "log-1", data: { status: "started" } },
    ]);
    expect(capturedBody.writes).toHaveLength(2);
  });

  it("propagates a non-ok commit response as a classified GoogleApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const { commitWrites } = await import("../firestore");
    await expect(
      commitWrites([{ kind: "set", collectionId: "members", docId: "uid-1", data: { a: 1 } }])
    ).rejects.toMatchObject({ kind: "server_error" });
  });
});

describe("runFirestoreTransaction", () => {
  function stubSequence(responses: Array<{ url: RegExp; response: () => Response }>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const match = responses.find((r) => r.url.test(url));
        if (!match) throw new Error(`unexpected fetch: ${url}`);
        return match.response();
      })
    );
  }

  it("runs fn, commits its queued writes, and returns fn's result on first-attempt success", async () => {
    stubSequence([
      { url: /:beginTransaction$/, response: () => jsonResponse({ transaction: "txn-1" }) },
      { url: /:commit$/, response: () => jsonResponse({}) },
    ]);
    const { runFirestoreTransaction } = await import("../firestore");
    const result = await runFirestoreTransaction(async (tx) => {
      tx.set("members", "uid-1", { role: "admin" });
      return "done";
    });
    expect(result).toBe("done");
  });

  it("tx.get performs a GET with the transaction id attached", async () => {
    let capturedGetUrl = "";
    stubSequence([
      { url: /:beginTransaction$/, response: () => jsonResponse({ transaction: "txn-1" }) },
      { url: /:commit$/, response: () => jsonResponse({}) },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(":beginTransaction")) return jsonResponse({ transaction: "txn-1" });
        if (url.endsWith(":commit")) return jsonResponse({});
        capturedGetUrl = url;
        return new Response("not found", { status: 404 });
      })
    );
    const { runFirestoreTransaction } = await import("../firestore");
    await runFirestoreTransaction(async (tx) => {
      await tx.get("members", "uid-1");
      return null;
    });
    expect(capturedGetUrl).toContain("members/uid-1?transaction=txn-1");
  });

  it("retries the whole callback on a 409 commit conflict, and succeeds on a later attempt", async () => {
    let beginCount = 0;
    let commitCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(":beginTransaction")) {
          beginCount++;
          return jsonResponse({ transaction: `txn-${beginCount}` });
        }
        if (url.endsWith(":commit")) {
          commitCount++;
          if (commitCount < 3) return new Response("conflict", { status: 409 });
          return jsonResponse({});
        }
        return new Response("not found", { status: 404 });
      })
    );
    const { runFirestoreTransaction } = await import("../firestore");
    let fnCallCount = 0;
    const result = await runFirestoreTransaction(
      async (tx) => {
        fnCallCount++;
        tx.set("systemConfig", "membership", { adminCount: 1 });
        return "eventually-ok";
      },
      { maxAttempts: 5 }
    );
    expect(result).toBe("eventually-ok");
    expect(fnCallCount).toBe(3);
    expect(beginCount).toBe(3);
  });

  it("gives up after maxAttempts consecutive 409 conflicts and throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(":beginTransaction")) return jsonResponse({ transaction: "txn-x" });
        if (url.endsWith(":commit")) return new Response("conflict", { status: 409 });
        return new Response("not found", { status: 404 });
      })
    );
    const { runFirestoreTransaction } = await import("../firestore");
    await expect(
      runFirestoreTransaction(
        async (tx) => {
          tx.set("systemConfig", "membership", { adminCount: 1 });
        },
        { maxAttempts: 3 }
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("does NOT retry when fn itself throws an application error (business rejection), and rolls back", async () => {
    let beginCount = 0;
    let rollbackCount = 0;
    let commitCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(":beginTransaction")) {
          beginCount++;
          return jsonResponse({ transaction: "txn-1" });
        }
        if (url.endsWith(":rollback")) {
          rollbackCount++;
          return jsonResponse({});
        }
        if (url.endsWith(":commit")) {
          commitCount++;
          return jsonResponse({});
        }
        return new Response("not found", { status: 404 });
      })
    );
    const { runFirestoreTransaction } = await import("../firestore");
    class BusinessError extends Error {}
    await expect(
      runFirestoreTransaction(async () => {
        throw new BusinessError("already claimed");
      })
    ).rejects.toBeInstanceOf(BusinessError);
    expect(beginCount).toBe(1); // 1回だけ実行、リトライしない
    expect(commitCount).toBe(0); // commitへは到達しない
    expect(rollbackCount).toBe(1); // rollbackは呼ばれる
  });

  it("a rollback-call failure does not mask the original application error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(":beginTransaction")) return jsonResponse({ transaction: "txn-1" });
        if (url.endsWith(":rollback")) return new Response("boom", { status: 500 });
        return new Response("not found", { status: 404 });
      })
    );
    const { runFirestoreTransaction } = await import("../firestore");
    await expect(
      runFirestoreTransaction(async () => {
        throw new Error("original business error");
      })
    ).rejects.toThrow("original business error");
  });

  it("propagates a non-409 commit failure immediately without retrying", async () => {
    let commitCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(":beginTransaction")) return jsonResponse({ transaction: "txn-1" });
        if (url.endsWith(":commit")) {
          commitCount++;
          return new Response("nope", { status: 500 });
        }
        return new Response("not found", { status: 404 });
      })
    );
    const { runFirestoreTransaction } = await import("../firestore");
    await expect(
      runFirestoreTransaction(async (tx) => {
        tx.set("members", "uid-1", { role: "admin" });
      })
    ).rejects.toMatchObject({ status: 500 });
    expect(commitCount).toBe(1);
  });
});

describe("newDocId", () => {
  it("generates a 20-character id using the Firestore auto-id alphabet", async () => {
    const { newDocId } = await import("../firestore");
    const id = newDocId();
    expect(id).toHaveLength(20);
    expect(id).toMatch(/^[A-Za-z0-9]{20}$/);
  });

  it("generates distinct ids across calls (no network required)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { newDocId } = await import("../firestore");
    const ids = new Set(Array.from({ length: 50 }, () => newDocId()));
    expect(ids.size).toBe(50);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
