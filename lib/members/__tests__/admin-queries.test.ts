import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getDocMock = vi.fn();
const runQueryMock = vi.fn();
const countDocsMock = vi.fn();

vi.mock("@/lib/firebase/rest/firestore", () => ({
  getDoc: (...args: unknown[]) => getDocMock(...args),
  runQuery: (...args: unknown[]) => runQueryMock(...args),
  countDocs: (...args: unknown[]) => countDocsMock(...args),
}));

beforeEach(() => {
  vi.resetModules();
  getDocMock.mockReset();
  runQueryMock.mockReset().mockResolvedValue([]);
  countDocsMock.mockReset().mockResolvedValue(0);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function docs(n: number, prefix = "m") {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`,
    data: { email: `${prefix}${i}@example.com`, emailLower: `${prefix}${i}@example.com`, createdAt: `2026-01-0${i + 1}T00:00:00.000Z` },
  }));
}

describe("listMembers", () => {
  it("defaults to ordering by createdAt desc with no where clause when no filters/search are given", async () => {
    runQueryMock.mockResolvedValue(docs(3));
    const { listMembers } = await import("../admin-queries");
    await listMembers({});
    expect(runQueryMock).toHaveBeenCalledWith({
      collectionId: "members",
      where: undefined,
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      startAtValue: undefined,
      endAtValue: undefined,
      startAfterValue: undefined,
      limit: 21,
    });
  });

  it("builds where clauses for role/accountStatus/contractStatus filters", async () => {
    const { listMembers } = await import("../admin-queries");
    await listMembers({ role: "admin", accountStatus: "active", contractStatus: "active" });
    const call = runQueryMock.mock.calls[0][0];
    expect(call.where).toEqual([
      { field: "role", op: "EQUAL", value: "admin" },
      { field: "accountStatus", op: "EQUAL", value: "active" },
      { field: "contractStatus", op: "EQUAL", value: "active" },
    ]);
  });

  it("switches to emailLower ascending with startAt=endAt=search when searching", async () => {
    const { listMembers } = await import("../admin-queries");
    await listMembers({ search: "  Taro@Example.com  " });
    const call = runQueryMock.mock.calls[0][0];
    expect(call.orderBy).toEqual({ field: "emailLower", direction: "ASCENDING" });
    expect(call.startAtValue).toBe("taro@example.com");
    expect(call.endAtValue).toBe("taro@example.com");
  });

  it("resolves the cursor document's value for the current orderBy field and passes it as startAfterValue", async () => {
    getDocMock.mockResolvedValue({ id: "m-5", data: { createdAt: "2026-01-05T00:00:00.000Z" } });
    const { listMembers } = await import("../admin-queries");
    await listMembers({ cursor: "m-5" });
    expect(getDocMock).toHaveBeenCalledWith("members", "m-5");
    const call = runQueryMock.mock.calls[0][0];
    expect(call.startAfterValue).toBe("2026-01-05T00:00:00.000Z");
  });

  it("ignores a cursor pointing at a deleted/non-existent document", async () => {
    getDocMock.mockResolvedValue(null);
    const { listMembers } = await import("../admin-queries");
    await listMembers({ cursor: "gone" });
    const call = runQueryMock.mock.calls[0][0];
    expect(call.startAfterValue).toBeUndefined();
  });

  it("caps pageSize at 100", async () => {
    const { listMembers } = await import("../admin-queries");
    await listMembers({ pageSize: 500 });
    expect(runQueryMock.mock.calls[0][0].limit).toBe(101);
  });

  it("reports nextCursor only when more results exist beyond the page (limit+1 pattern)", async () => {
    runQueryMock.mockResolvedValue(docs(3)); // pageSize(2)+1件返す => もっとある
    const { listMembers } = await import("../admin-queries");
    const page = await listMembers({ pageSize: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe("m-1");
  });

  it("reports nextCursor=null when exactly pageSize results are returned (no more pages)", async () => {
    runQueryMock.mockResolvedValue(docs(2));
    const { listMembers } = await import("../admin-queries");
    const page = await listMembers({ pageSize: 2 });
    expect(page.nextCursor).toBeNull();
  });
});

describe("listInvitations / listAuditLogs", () => {
  it("listInvitations filters by status and orders by createdAt desc", async () => {
    const { listInvitations } = await import("../admin-queries");
    await listInvitations({ status: "pending" });
    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "invitations",
        where: [{ field: "status", op: "EQUAL", value: "pending" }],
        orderBy: { field: "createdAt", direction: "DESCENDING" },
      })
    );
  });

  it("listAuditLogs filters by action and orders by createdAt desc", async () => {
    const { listAuditLogs } = await import("../admin-queries");
    await listAuditLogs({ action: "update_role" });
    expect(runQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "adminAuditLogs",
        where: [{ field: "action", op: "EQUAL", value: "update_role" }],
      })
    );
  });
});

describe("listLogs", () => {
  it("maps result=succeeded/failed to an eventType equality filter", async () => {
    const { listLogs } = await import("../admin-queries");
    await listLogs({ result: "succeeded" });
    expect(runQueryMock.mock.calls[0][0].where).toEqual([
      { field: "eventType", op: "EQUAL", value: "colorize_succeeded" },
    ]);
  });

  it("applies an errorCode substring post-filter without adding it as a Firestore where clause", async () => {
    runQueryMock.mockResolvedValue([
      { id: "l-1", data: { errorCode: "OOM_ERROR", createdAt: "2026-01-01T00:00:00.000Z" } },
      { id: "l-2", data: { errorCode: "NETWORK_TIMEOUT", createdAt: "2026-01-02T00:00:00.000Z" } },
    ]);
    const { listLogs } = await import("../admin-queries");
    const page = await listLogs({ errorCode: "oom" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].errorCode).toBe("OOM_ERROR");
    // Firestoreクエリ自体にはerrorCodeのwhereを積まない（indexを増やさない既存方針）
    expect(runQueryMock.mock.calls[0][0].where).toBeUndefined();
  });
});

describe("getDashboardStats", () => {
  it("issues 6 independent count queries with the exact expected filters", async () => {
    countDocsMock.mockResolvedValue(3);
    const { getDashboardStats } = await import("../admin-queries");
    const stats = await getDashboardStats();

    expect(stats).toEqual({
      activeUsers: 3,
      paymentPending: 3,
      suspended: 3,
      todayStarted: 3,
      todaySucceeded: 3,
      todayFailed: 3,
    });
    expect(countDocsMock).toHaveBeenCalledTimes(6);
    expect(countDocsMock).toHaveBeenCalledWith({
      collectionId: "members",
      where: [{ field: "accountStatus", op: "EQUAL", value: "active" }],
    });
    const todayStartedCall = countDocsMock.mock.calls.find(
      (c) => (c[0].where as Array<{ value: unknown }>)?.[0]?.value === "colorize_started"
    );
    expect(todayStartedCall?.[0].where[1]).toMatchObject({ field: "createdAt", op: "GREATER_THAN_OR_EQUAL" });
  });
});

describe("getRecentLogs", () => {
  it("defaults to limit 10, ordered by createdAt desc", async () => {
    const { getRecentLogs } = await import("../admin-queries");
    await getRecentLogs();
    expect(runQueryMock).toHaveBeenCalledWith({
      collectionId: "colorizationLogs",
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      limit: 10,
    });
  });

  it("honors a custom limit", async () => {
    const { getRecentLogs } = await import("../admin-queries");
    await getRecentLogs(25);
    expect(runQueryMock.mock.calls[0][0].limit).toBe(25);
  });
});

describe("resolveMemberLabels", () => {
  it("deduplicates ids and skips ones with no matching member", async () => {
    getDocMock.mockImplementation(async (_c: string, uid: string) =>
      uid === "uid-1" ? { id: "uid-1", data: { displayName: "Taro", email: "a@example.com" } } : null
    );
    const { resolveMemberLabels } = await import("../admin-queries");
    const map = await resolveMemberLabels(["uid-1", "uid-1", "uid-2", ""]);
    expect(getDocMock).toHaveBeenCalledTimes(2); // "uid-1"(重複除去済み), "uid-2" のみ（空文字は除外）
    expect(map.get("uid-1")).toEqual({ displayName: "Taro", email: "a@example.com" });
    expect(map.has("uid-2")).toBe(false);
  });
});

describe("findMemberIdsBySearch", () => {
  it("returns [] for an empty/whitespace-only search without querying", async () => {
    const { findMemberIdsBySearch } = await import("../admin-queries");
    expect(await findMemberIdsBySearch("   ")).toEqual([]);
    expect(runQueryMock).not.toHaveBeenCalled();
  });

  it("queries emailLower with startAt=endAt=the normalized search term, limit 50", async () => {
    runQueryMock.mockResolvedValue(docs(2));
    const { findMemberIdsBySearch } = await import("../admin-queries");
    const ids = await findMemberIdsBySearch("  Taro@Example.com ");
    expect(runQueryMock).toHaveBeenCalledWith({
      collectionId: "members",
      orderBy: { field: "emailLower", direction: "ASCENDING" },
      startAtValue: "taro@example.com",
      endAtValue: "taro@example.com",
      limit: 50,
    });
    expect(ids).toEqual(["m-0", "m-1"]);
  });
});
