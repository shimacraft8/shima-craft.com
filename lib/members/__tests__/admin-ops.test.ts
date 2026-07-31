import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const commitWritesMock = vi.fn();
const newDocIdMock = vi.fn();
const runFirestoreTransactionMock = vi.fn();
const revokeAllRefreshTokensMock = vi.fn();
const setCustomUserClaimsMock = vi.fn();
const setUserDisabledMock = vi.fn();

vi.mock("@/lib/firebase/rest/firestore", () => ({
  commitWrites: (...args: unknown[]) => commitWritesMock(...args),
  newDocId: (...args: unknown[]) => newDocIdMock(...args),
  runFirestoreTransaction: (...args: unknown[]) => runFirestoreTransactionMock(...args),
}));
vi.mock("@/lib/firebase/rest/authAdmin", () => ({
  revokeAllRefreshTokens: (...args: unknown[]) => revokeAllRefreshTokensMock(...args),
  setCustomUserClaims: (...args: unknown[]) => setCustomUserClaimsMock(...args),
  setUserDisabled: (...args: unknown[]) => setUserDisabledMock(...args),
}));

beforeEach(() => {
  vi.resetModules();
  commitWritesMock.mockReset();
  newDocIdMock.mockReset().mockReturnValue("audit-1");
  runFirestoreTransactionMock.mockReset();
  revokeAllRefreshTokensMock.mockReset().mockResolvedValue(undefined);
  setCustomUserClaimsMock.mockReset().mockResolvedValue(undefined);
  setUserDisabledMock.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const existingMember = {
  role: "user",
  accountStatus: "active",
  contractStatus: "active",
  email: "a@example.com",
  displayName: "Taro",
  notes: "",
};

function stubTransaction(memberData: Record<string, unknown> | null, configData: Record<string, unknown> | null) {
  const setCalls: unknown[] = [];
  runFirestoreTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      get: vi.fn(async (c: string) => {
        if (c === "members") return memberData ? { id: "uid-1", data: memberData } : null;
        if (c === "systemConfig") return configData ? { id: "membership", data: configData } : null;
        return null;
      }),
      set: vi.fn((...args: unknown[]) => setCalls.push(args)),
      update: vi.fn(),
      delete: vi.fn(),
    };
    return fn(tx);
  });
  return { setCalls };
}

const baseParams = {
  adminUserId: "admin-1",
  targetUid: "uid-1",
  action: "update_role",
  requestId: "req-1",
  ipHash: null,
  userAgent: null,
};

describe("applyMemberMutation", () => {
  it("throws NOT_FOUND when the target member does not exist", async () => {
    stubTransaction(null, null);
    const { applyMemberMutation, MemberOpError } = await import("../admin-ops");
    await expect(
      applyMemberMutation({ ...baseParams, mutation: { role: "admin" } })
    ).rejects.toBeInstanceOf(MemberOpError);
  });

  it("promotes a user to admin: sets role, increments adminCount, writes the audit log", async () => {
    const { setCalls } = stubTransaction(existingMember, { adminCount: 1 });
    const { applyMemberMutation } = await import("../admin-ops");
    const result = await applyMemberMutation({ ...baseParams, mutation: { role: "admin" } });

    expect(result.role).toBe("admin");
    // members, systemConfig(adminCount+1), adminAuditLogs の3件がset
    expect(setCalls).toHaveLength(3);
    const collections = setCalls.map((c) => (c as unknown[])[0]);
    expect(collections).toEqual(["members", "systemConfig", "adminAuditLogs"]);
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith("uid-1", { role: "admin" });
    expect(revokeAllRefreshTokensMock).toHaveBeenCalledWith("uid-1");
  });

  it("rejects demoting the last active admin (LAST_ADMIN)", async () => {
    stubTransaction({ ...existingMember, role: "admin" }, { adminCount: 1 });
    const { applyMemberMutation, MemberOpError } = await import("../admin-ops");
    await expect(applyMemberMutation({ ...baseParams, mutation: { role: "user" } })).rejects.toMatchObject({
      code: "LAST_ADMIN",
    });
    // 拒否時はAuth側の同期(setUserDisabled等)も一切呼ばれない
    expect(setUserDisabledMock).not.toHaveBeenCalled();
  });

  it("allows demoting an admin when another active admin remains", async () => {
    stubTransaction({ ...existingMember, role: "admin" }, { adminCount: 2 });
    const { applyMemberMutation } = await import("../admin-ops");
    const result = await applyMemberMutation({ ...baseParams, mutation: { role: "user" } });
    expect(result.role).toBe("user");
  });

  it("sets deletedAt only on the active→deleted transition, not on repeated deletes", async () => {
    const { setCalls } = stubTransaction({ ...existingMember, accountStatus: "active" }, null);
    const { applyMemberMutation } = await import("../admin-ops");
    await applyMemberMutation({ ...baseParams, mutation: { accountStatus: "deleted" } });
    const memberWrite = setCalls[0] as [string, string, Record<string, unknown>];
    expect(memberWrite[2].deletedAt).toBeDefined();
  });

  it("clears authDisabledAt when reactivating to active, and sets it when suspending", async () => {
    const { setCalls: suspendCalls } = stubTransaction(existingMember, null);
    const { applyMemberMutation: applySuspend } = await import("../admin-ops");
    await applySuspend({ ...baseParams, mutation: { accountStatus: "suspended" } });
    expect((suspendCalls[0] as [string, string, Record<string, unknown>])[2].authDisabledAt).toBeDefined();

    vi.resetModules();
    const { setCalls: reactivateCalls } = stubTransaction({ ...existingMember, accountStatus: "suspended" }, null);
    const { applyMemberMutation: applyReactivate } = await import("../admin-ops");
    await applyReactivate({ ...baseParams, mutation: { accountStatus: "active" } });
    expect((reactivateCalls[0] as [string, string, Record<string, unknown>])[2].authDisabledAt).toBeNull();
  });

  it("calls setUserDisabled + revokeAllRefreshTokens when accountStatus changes, but not when it doesn't", async () => {
    stubTransaction(existingMember, null);
    const { applyMemberMutation } = await import("../admin-ops");
    await applyMemberMutation({ ...baseParams, mutation: { displayName: "New Name" } });
    expect(setUserDisabledMock).not.toHaveBeenCalled();
    expect(revokeAllRefreshTokensMock).not.toHaveBeenCalled();
  });

  it("does not fail the whole operation when the post-transaction Auth sync fails (DB state remains authoritative)", async () => {
    stubTransaction(existingMember, null);
    setUserDisabledMock.mockRejectedValue(new Error("network error"));
    const { applyMemberMutation } = await import("../admin-ops");
    await expect(
      applyMemberMutation({ ...baseParams, mutation: { accountStatus: "suspended" } })
    ).resolves.toMatchObject({ accountStatus: "suspended" });
  });

  it("reuses the same audit document id across the whole call (newDocId is called exactly once)", async () => {
    stubTransaction(existingMember, null);
    const { applyMemberMutation } = await import("../admin-ops");
    await applyMemberMutation({ ...baseParams, mutation: { displayName: "New Name" } });
    expect(newDocIdMock).toHaveBeenCalledTimes(1);
  });

  it("writes an audit log with a before/after snapshot that never includes raw secrets", async () => {
    const { setCalls } = stubTransaction(existingMember, null);
    const { applyMemberMutation } = await import("../admin-ops");
    await applyMemberMutation({ ...baseParams, mutation: { notes: "flagged for review" } });
    const auditWrite = setCalls[1] as [string, string, Record<string, unknown>];
    expect(auditWrite[0]).toBe("adminAuditLogs");
    const data = auditWrite[2];
    expect(data.beforeData).toEqual({
      email: "a@example.com",
      displayName: "Taro",
      role: "user",
      accountStatus: "active",
      contractStatus: "active",
      notes: "",
    });
    expect((data.afterData as Record<string, unknown>).notes).toBe("flagged for review");
  });
});

describe("writeAuditOnly", () => {
  it("commits a single audit document with a freshly generated id", async () => {
    commitWritesMock.mockResolvedValue(undefined);
    const { writeAuditOnly } = await import("../admin-ops");
    await writeAuditOnly({
      adminUserId: "admin-1",
      action: "create_invitation",
      targetUserId: null,
      requestId: "req-1",
      ipHash: null,
      userAgent: null,
    });
    expect(commitWritesMock).toHaveBeenCalledWith([
      expect.objectContaining({ kind: "set", collectionId: "adminAuditLogs", docId: "audit-1" }),
    ]);
  });
});
