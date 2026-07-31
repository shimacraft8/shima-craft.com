import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getDocMock = vi.fn();
const runQueryMock = vi.fn();
const commitWritesMock = vi.fn();

vi.mock("@/lib/firebase/rest/firestore", () => ({
  getDoc: (...args: unknown[]) => getDocMock(...args),
  runQuery: (...args: unknown[]) => runQueryMock(...args),
  commitWrites: (...args: unknown[]) => commitWritesMock(...args),
}));

beforeEach(() => {
  vi.resetModules();
  getDocMock.mockReset();
  runQueryMock.mockReset();
  commitWritesMock.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("mapMember", () => {
  it("maps a full document, decoding string timestamps as-is", async () => {
    const { mapMember } = await import("../repo");
    const member = mapMember("uid-1", {
      email: "a@example.com",
      emailLower: "a@example.com",
      displayName: "Taro",
      role: "admin",
      accountStatus: "active",
      contractStatus: "active",
      notes: "note",
      lastLoginAt: "2026-07-31T00:00:00.000Z",
      lastUsedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      deletedAt: null,
      authDisabledAt: null,
    });
    expect(member).toEqual({
      uid: "uid-1",
      email: "a@example.com",
      emailLower: "a@example.com",
      displayName: "Taro",
      role: "admin",
      accountStatus: "active",
      contractStatus: "active",
      notes: "note",
      lastLoginAt: "2026-07-31T00:00:00.000Z",
      lastUsedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      deletedAt: null,
      authDisabledAt: null,
    });
  });

  it("falls back to safe defaults for missing/invalid enum fields", async () => {
    const { mapMember } = await import("../repo");
    const member = mapMember("uid-2", { role: "not-a-role", accountStatus: "bogus", contractStatus: "bogus" });
    expect(member.role).toBe("user");
    expect(member.accountStatus).toBe("suspended");
    expect(member.contractStatus).toBe("payment_pending");
    expect(member.createdAt).toBe(new Date(0).toISOString());
  });
});

describe("getMember", () => {
  it("returns null when the document does not exist", async () => {
    getDocMock.mockResolvedValue(null);
    const { getMember } = await import("../repo");
    expect(await getMember("uid-1")).toBeNull();
  });

  it("returns the mapped member when found", async () => {
    getDocMock.mockResolvedValue({ id: "uid-1", data: { email: "a@example.com", role: "user" } });
    const { getMember, COLLECTIONS } = await import("../repo");
    const member = await getMember("uid-1");
    expect(member?.email).toBe("a@example.com");
    expect(getDocMock).toHaveBeenCalledWith(COLLECTIONS.members, "uid-1");
  });
});

describe("findMemberByEmail", () => {
  it("returns null when no match", async () => {
    runQueryMock.mockResolvedValue([]);
    const { findMemberByEmail } = await import("../repo");
    expect(await findMemberByEmail("nobody@example.com")).toBeNull();
  });

  it("queries by emailLower equality with limit 1 and maps the first result", async () => {
    runQueryMock.mockResolvedValue([{ id: "uid-1", data: { email: "a@example.com" } }]);
    const { findMemberByEmail, COLLECTIONS } = await import("../repo");
    const member = await findMemberByEmail("a@example.com");
    expect(member?.email).toBe("a@example.com");
    expect(runQueryMock).toHaveBeenCalledWith({
      collectionId: COLLECTIONS.members,
      where: [{ field: "emailLower", op: "EQUAL", value: "a@example.com" }],
      limit: 1,
    });
  });
});

describe("touchLastLogin", () => {
  it("commits a merge-write of lastLoginAt as a serverTimestamp sentinel", async () => {
    commitWritesMock.mockResolvedValue(undefined);
    const { touchLastLogin, COLLECTIONS } = await import("../repo");
    const { isFieldSentinel } = await import("@/lib/firebase/rest/firestoreValues");
    await touchLastLogin("uid-1");
    expect(commitWritesMock).toHaveBeenCalledTimes(1);
    const [ops] = commitWritesMock.mock.calls[0] as [Array<Record<string, unknown>>];
    expect(ops[0].kind).toBe("set");
    expect(ops[0].collectionId).toBe(COLLECTIONS.members);
    expect(ops[0].docId).toBe("uid-1");
    expect(ops[0].merge).toBe(true);
    expect(isFieldSentinel((ops[0].data as Record<string, unknown>).lastLoginAt)).toBe(true);
  });
});
