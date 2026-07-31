import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const commitWritesMock = vi.fn();
const getDocMock = vi.fn();
const runFirestoreTransactionMock = vi.fn();
const runQueryMock = vi.fn();

vi.mock("@/lib/firebase/rest/firestore", () => ({
  commitWrites: (...args: unknown[]) => commitWritesMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  runFirestoreTransaction: (...args: unknown[]) => runFirestoreTransactionMock(...args),
  runQuery: (...args: unknown[]) => runQueryMock(...args),
}));

vi.mock("../tokens", () => ({
  generateInvitationToken: vi.fn(() => "raw-token"),
  hashEmail: vi.fn((e: string) => `hash(${e})`),
  hashToken: vi.fn((t: string) => `hash(${t})`),
  newInvitationId: vi.fn(() => "inv-new-1"),
}));

beforeEach(() => {
  vi.resetModules();
  commitWritesMock.mockReset();
  getDocMock.mockReset();
  runFirestoreTransactionMock.mockReset();
  runQueryMock.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const baseInput = {
  emailLower: "a@example.com",
  displayName: "Taro",
  role: "user" as const,
  accountStatus: "active" as const,
  contractStatus: "active" as const,
  createdBy: "admin-uid",
};

describe("createInvitation", () => {
  it("revokes existing pending invitations for the same email before creating a new one", async () => {
    runQueryMock.mockResolvedValue([{ id: "old-1", data: {} }, { id: "old-2", data: {} }]);
    commitWritesMock.mockResolvedValue(undefined);
    getDocMock.mockResolvedValue({ id: "inv-new-1", data: { emailLower: "a@example.com", status: "pending" } });

    const { createInvitation } = await import("../invitations");
    const { invitation, rawToken } = await createInvitation(baseInput);

    expect(rawToken).toBe("raw-token");
    expect(invitation.id).toBe("inv-new-1");
    // 1回目のcommitWrites呼び出しが既存pendingの失効
    const firstCallOps = commitWritesMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(firstCallOps).toEqual([
      { kind: "update", collectionId: "invitations", docId: "old-1", data: { status: "revoked" } },
      { kind: "update", collectionId: "invitations", docId: "old-2", data: { status: "revoked" } },
    ]);
  });

  it("skips the revoke commit entirely when there are no existing pending invitations", async () => {
    runQueryMock.mockResolvedValue([]);
    commitWritesMock.mockResolvedValue(undefined);
    getDocMock.mockResolvedValue({ id: "inv-new-1", data: { emailLower: "a@example.com" } });

    const { createInvitation } = await import("../invitations");
    await createInvitation(baseInput);

    // 失効対象がない場合はcommitWritesは新規作成の1回だけ呼ばれる
    expect(commitWritesMock).toHaveBeenCalledTimes(1);
  });

  it("queries pending invitations for the target email without an explicit limit (unbounded, matches original)", async () => {
    runQueryMock.mockResolvedValue([]);
    commitWritesMock.mockResolvedValue(undefined);
    getDocMock.mockResolvedValue({ id: "inv-new-1", data: {} });
    const { createInvitation } = await import("../invitations");
    await createInvitation(baseInput);
    expect(runQueryMock).toHaveBeenCalledWith({
      collectionId: "invitations",
      where: [
        { field: "emailLower", op: "EQUAL", value: "a@example.com" },
        { field: "status", op: "EQUAL", value: "pending" },
      ],
    });
  });
});

describe("findInvitationByToken", () => {
  it("returns null when no invitation matches the token hash", async () => {
    runQueryMock.mockResolvedValue([]);
    const { findInvitationByToken } = await import("../invitations");
    expect(await findInvitationByToken("some-token")).toBeNull();
  });

  it("looks up by tokenHash and returns the mapped invitation", async () => {
    runQueryMock.mockResolvedValue([{ id: "inv-1", data: { emailLower: "a@example.com", status: "pending" } }]);
    const { findInvitationByToken } = await import("../invitations");
    const result = await findInvitationByToken("some-token");
    expect(result?.id).toBe("inv-1");
    expect(runQueryMock).toHaveBeenCalledWith({
      collectionId: "invitations",
      where: [{ field: "tokenHash", op: "EQUAL", value: "hash(some-token)" }],
      limit: 1,
    });
  });
});

function stubTransaction(getImpl: (collectionId: string, docId: string) => unknown) {
  const setCalls: unknown[] = [];
  const updateCalls: unknown[] = [];
  runFirestoreTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      get: vi.fn(async (c: string, d: string) => getImpl(c, d)),
      set: vi.fn((...args: unknown[]) => setCalls.push(args)),
      update: vi.fn((...args: unknown[]) => updateCalls.push(args)),
      delete: vi.fn(),
    };
    return fn(tx);
  });
  return { setCalls, updateCalls };
}

describe("claimInvitation", () => {
  const params = { invitationId: "inv-1", uid: "uid-1", googleEmail: "a@example.com", displayName: "Taro" };

  it("throws NOT_FOUND when the invitation doc does not exist", async () => {
    stubTransaction(() => null);
    const { claimInvitation, InvitationError } = await import("../invitations");
    await expect(claimInvitation(params)).rejects.toBeInstanceOf(InvitationError);
    await expect(claimInvitation(params)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws ALREADY_CLAIMED when the invitation is already claimed", async () => {
    stubTransaction((c) => (c === "invitations" ? { id: "inv-1", data: { status: "claimed", emailLower: "a@example.com", expiresAt: new Date(Date.now() + 1e9).toISOString() } } : null));
    const { claimInvitation } = await import("../invitations");
    await expect(claimInvitation(params)).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
  });

  it("throws REVOKED when the invitation was revoked", async () => {
    stubTransaction((c) => (c === "invitations" ? { id: "inv-1", data: { status: "revoked", emailLower: "a@example.com", expiresAt: new Date(Date.now() + 1e9).toISOString() } } : null));
    const { claimInvitation } = await import("../invitations");
    await expect(claimInvitation(params)).rejects.toMatchObject({ code: "REVOKED" });
  });

  it("throws EXPIRED when past the expiry date", async () => {
    stubTransaction((c) =>
      c === "invitations"
        ? { id: "inv-1", data: { status: "pending", emailLower: "a@example.com", expiresAt: new Date(Date.now() - 1000).toISOString() } }
        : null
    );
    const { claimInvitation } = await import("../invitations");
    await expect(claimInvitation(params)).rejects.toMatchObject({ code: "EXPIRED" });
  });

  it("throws EMAIL_MISMATCH when the Google email does not match the invited email", async () => {
    stubTransaction((c) =>
      c === "invitations"
        ? { id: "inv-1", data: { status: "pending", emailLower: "other@example.com", expiresAt: new Date(Date.now() + 1e9).toISOString() } }
        : null
    );
    const { claimInvitation } = await import("../invitations");
    await expect(claimInvitation(params)).rejects.toMatchObject({ code: "EMAIL_MISMATCH" });
  });

  it("does not overwrite an already-active member: only marks the invitation claimed and returns their existing role", async () => {
    const { setCalls, updateCalls } = stubTransaction((c) => {
      if (c === "invitations") {
        return { id: "inv-1", data: { status: "pending", emailLower: "a@example.com", role: "admin", accountStatus: "active", expiresAt: new Date(Date.now() + 1e9).toISOString() } };
      }
      if (c === "members") return { id: "uid-1", data: { role: "user", accountStatus: "active" } };
      return null;
    });
    const { claimInvitation } = await import("../invitations");
    const result = await claimInvitation(params);
    expect(result).toEqual({ role: "user" });
    expect(setCalls).toHaveLength(0); // memberは新規作成しない
    expect(updateCalls).toHaveLength(1); // invitationのclaimed更新のみ
  });

  it("creates the member, marks the invitation claimed, and increments adminCount when the invitation grants admin", async () => {
    const { setCalls, updateCalls } = stubTransaction((c) => {
      if (c === "invitations") {
        return {
          id: "inv-1",
          data: { status: "pending", emailLower: "a@example.com", role: "admin", accountStatus: "active", contractStatus: "active", expiresAt: new Date(Date.now() + 1e9).toISOString() },
        };
      }
      return null; // memberは存在しない
    });
    const { claimInvitation } = await import("../invitations");
    const result = await claimInvitation(params);
    expect(result).toEqual({ role: "admin" });
    expect(setCalls).toHaveLength(2); // member作成 + systemConfig更新
    expect(updateCalls).toHaveLength(1);
    const configCall = setCalls[1] as [string, string, Record<string, unknown>];
    expect(configCall[0]).toBe("systemConfig");
  });

  it("creates a non-admin member without touching systemConfig/adminCount", async () => {
    const { setCalls } = stubTransaction((c) => {
      if (c === "invitations") {
        return {
          id: "inv-1",
          data: { status: "pending", emailLower: "a@example.com", role: "user", accountStatus: "active", contractStatus: "active", expiresAt: new Date(Date.now() + 1e9).toISOString() },
        };
      }
      return null;
    });
    const { claimInvitation } = await import("../invitations");
    await claimInvitation(params);
    expect(setCalls).toHaveLength(1); // memberのみ、systemConfigへは触れない
  });

  it("re-activates a previously deleted member (treats it as not-yet-a-member)", async () => {
    const { setCalls } = stubTransaction((c) => {
      if (c === "invitations") {
        return {
          id: "inv-1",
          data: { status: "pending", emailLower: "a@example.com", role: "user", accountStatus: "active", contractStatus: "active", expiresAt: new Date(Date.now() + 1e9).toISOString() },
        };
      }
      if (c === "members") return { id: "uid-1", data: { accountStatus: "deleted" } };
      return null;
    });
    const { claimInvitation } = await import("../invitations");
    await claimInvitation(params);
    expect(setCalls).toHaveLength(1); // 既存accountStatus=deletedは「未加入」扱いで再作成される
  });
});

describe("resendInvitation", () => {
  it("returns null when the invitation does not exist", async () => {
    getDocMock.mockResolvedValue(null);
    const { resendInvitation } = await import("../invitations");
    expect(await resendInvitation("inv-1")).toBeNull();
  });

  it("returns null for a claimed or revoked invitation", async () => {
    getDocMock.mockResolvedValue({ id: "inv-1", data: { status: "claimed" } });
    const { resendInvitation } = await import("../invitations");
    expect(await resendInvitation("inv-1")).toBeNull();
    expect(commitWritesMock).not.toHaveBeenCalled();
  });

  it("issues a new token hash and resets status/expiresAt/resentAt", async () => {
    getDocMock
      .mockResolvedValueOnce({ id: "inv-1", data: { status: "expired" } })
      .mockResolvedValueOnce({ id: "inv-1", data: { status: "pending" } });
    commitWritesMock.mockResolvedValue(undefined);
    const { resendInvitation } = await import("../invitations");
    const result = await resendInvitation("inv-1");
    expect(result?.rawToken).toBe("raw-token");
    const ops = commitWritesMock.mock.calls[0][0] as Array<{ data: Record<string, unknown> }>;
    expect(ops[0].data.tokenHash).toBe("hash(raw-token)");
    expect(ops[0].data.status).toBe("pending");
  });
});

describe("revokeInvitation", () => {
  it("returns false when not found", async () => {
    getDocMock.mockResolvedValue(null);
    const { revokeInvitation } = await import("../invitations");
    expect(await revokeInvitation("inv-1")).toBe(false);
  });

  it("returns false for an already-claimed invitation (cannot revoke)", async () => {
    getDocMock.mockResolvedValue({ id: "inv-1", data: { status: "claimed" } });
    const { revokeInvitation } = await import("../invitations");
    expect(await revokeInvitation("inv-1")).toBe(false);
    expect(commitWritesMock).not.toHaveBeenCalled();
  });

  it("revokes a pending invitation", async () => {
    getDocMock.mockResolvedValue({ id: "inv-1", data: { status: "pending" } });
    commitWritesMock.mockResolvedValue(undefined);
    const { revokeInvitation } = await import("../invitations");
    expect(await revokeInvitation("inv-1")).toBe(true);
    expect(commitWritesMock).toHaveBeenCalledWith([
      { kind: "update", collectionId: "invitations", docId: "inv-1", data: { status: "revoked" } },
    ]);
  });
});

describe("markInvitationDeliveryFailed", () => {
  it("commits a status update without a prior existence check (matches original .update() semantics)", async () => {
    commitWritesMock.mockResolvedValue(undefined);
    const { markInvitationDeliveryFailed } = await import("../invitations");
    await markInvitationDeliveryFailed("inv-1");
    expect(getDocMock).not.toHaveBeenCalled();
    expect(commitWritesMock).toHaveBeenCalledWith([
      { kind: "update", collectionId: "invitations", docId: "inv-1", data: { status: "delivery_failed" } },
    ]);
  });
});
