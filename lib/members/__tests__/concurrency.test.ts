import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestoreBackend } from "./fakeFirestoreRest";

/**
 * Stage 8で要求される並行テスト。モックではなく実際の
 * runFirestoreTransaction（lib/firebase/rest/firestore.ts）に対して、
 * インメモリの疑似Firestore REST バックエンド（楽観的並行性制御つき）を使い、
 * 本物の競合・リトライ・rollback経路を検証する。
 */

const ORIGINAL_ENV = { ...process.env };

vi.mock("@/lib/firebase/rest/googleAuth", () => ({
  getServiceAccountAccessToken: vi.fn(async () => "fake-access-token"),
}));
vi.mock("@/lib/firebase/rest/authAdmin", () => ({
  setCustomUserClaims: vi.fn(async () => undefined),
  setUserDisabled: vi.fn(async () => undefined),
  revokeAllRefreshTokens: vi.fn(async () => undefined),
}));

function installFetch(backend: FakeFirestoreBackend) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => backend.handleFetch(url, init ?? {}))
  );
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: "test-project" };
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("1. 初期管理者ブートストラップの競合", () => {
  it("creates exactly one admin when two first-logins race for the same INITIAL_ADMIN_EMAIL", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    const backend = new FakeFirestoreBackend();
    installFetch(backend);
    const { tryBootstrapInitialAdmin } = await import("../login");

    const [a, b] = await Promise.all([
      tryBootstrapInitialAdmin("uid-A", "admin@example.com", "A"),
      tryBootstrapInitialAdmin("uid-B", "admin@example.com", "B"),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    const config = backend.get("systemConfig", "membership");
    expect(config?.fields.adminCount).toEqual({ integerValue: "1" });
    expect(config?.fields.bootstrapCompleted).toEqual({ booleanValue: true });
    // どちらか一方のmemberだけが作られている
    const createdCount = [backend.get("members", "uid-A"), backend.get("members", "uid-B")].filter(Boolean).length;
    expect(createdCount).toBe(1);
  });
});

describe("2. 最後の有効adminの保護", () => {
  it("protects the last active admin when two admins are suspended concurrently", async () => {
    const backend = new FakeFirestoreBackend();
    backend.seed("members", "admin-X", { role: "admin", accountStatus: "active", contractStatus: "active", email: "x@example.com", emailLower: "x@example.com", displayName: "X", notes: "" });
    backend.seed("members", "admin-Y", { role: "admin", accountStatus: "active", contractStatus: "active", email: "y@example.com", emailLower: "y@example.com", displayName: "Y", notes: "" });
    backend.seed("systemConfig", "membership", { adminCount: 2 });
    installFetch(backend);
    const { applyMemberMutation, MemberOpError } = await import("../admin-ops");

    const results = await Promise.allSettled([
      applyMemberMutation({
        adminUserId: "root", targetUid: "admin-X", action: "suspend", mutation: { accountStatus: "suspended" },
        requestId: "req-x", ipHash: null, userAgent: null,
      }),
      applyMemberMutation({
        adminUserId: "root", targetUid: "admin-Y", action: "suspend", mutation: { accountStatus: "suspended" },
        requestId: "req-y", ipHash: null, userAgent: null,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(MemberOpError);
    expect((rejected[0] as PromiseRejectedResult).reason.code).toBe("LAST_ADMIN");

    const config = backend.get("systemConfig", "membership");
    expect(config?.fields.adminCount).toEqual({ integerValue: "1" });
  });
});

describe("3. 招待の同時claim", () => {
  it("activates the invitation exactly once when the same invitation is claimed concurrently", async () => {
    const backend = new FakeFirestoreBackend();
    backend.seed("invitations", "inv-1", {
      emailLower: "a@example.com",
      status: "pending",
      role: "user",
      accountStatus: "active",
      contractStatus: "active",
      displayName: "",
      expiresAt: new Date(Date.now() + 1e9),
    });
    installFetch(backend);
    const { claimInvitation, InvitationError } = await import("../invitations");

    const results = await Promise.allSettled([
      claimInvitation({ invitationId: "inv-1", uid: "uid-A", googleEmail: "a@example.com", displayName: "A" }),
      claimInvitation({ invitationId: "inv-1", uid: "uid-B", googleEmail: "a@example.com", displayName: "B" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InvitationError);
    expect((rejected[0] as PromiseRejectedResult).reason.code).toBe("ALREADY_CLAIMED");

    const memberACreated = Boolean(backend.get("members", "uid-A"));
    const memberBCreated = Boolean(backend.get("members", "uid-B"));
    expect([memberACreated, memberBCreated].filter(Boolean)).toHaveLength(1);
    expect(backend.get("invitations", "inv-1")?.fields.status).toEqual({ stringValue: "claimed" });
  });
});

describe("4. 同一ユーザーへの同時権限更新", () => {
  it("both concurrent mutations end up reflected in the final state (no lost update)", async () => {
    const backend = new FakeFirestoreBackend();
    backend.seed("members", "uid-1", {
      role: "user",
      accountStatus: "active",
      contractStatus: "active",
      email: "a@example.com",
      emailLower: "a@example.com",
      displayName: "Original Name",
      notes: "",
    });
    installFetch(backend);
    const { applyMemberMutation } = await import("../admin-ops");

    await Promise.all([
      applyMemberMutation({
        adminUserId: "root", targetUid: "uid-1", action: "promote", mutation: { role: "admin" },
        requestId: "req-1", ipHash: null, userAgent: null,
      }),
      applyMemberMutation({
        adminUserId: "root", targetUid: "uid-1", action: "rename", mutation: { displayName: "New Name" },
        requestId: "req-2", ipHash: null, userAgent: null,
      }),
    ]);

    const member = backend.get("members", "uid-1");
    expect(member?.fields.role).toEqual({ stringValue: "admin" });
    expect(member?.fields.displayName).toEqual({ stringValue: "New Name" });
  });
});

describe("5. transaction途中の通信失敗", () => {
  it("leaves no partial writes when a read fails mid-transaction (rolls back, propagates the error)", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    const backend = new FakeFirestoreBackend();
    let getCallCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = new URL(url);
        const isPlainGet = !u.pathname.match(/:(beginTransaction|commit|rollback|runQuery)$/);
        if (isPlainGet) {
          getCallCount++;
          if (getCallCount === 2) {
            throw new DOMException("aborted", "TimeoutError");
          }
        }
        return backend.handleFetch(url, init ?? {});
      })
    );
    const { tryBootstrapInitialAdmin } = await import("../login");

    await expect(tryBootstrapInitialAdmin("uid-1", "admin@example.com", "Admin")).rejects.toThrow();

    // 何も書き込まれていないこと（部分適用なし）
    expect(backend.get("members", "uid-1")).toBeUndefined();
    expect(backend.get("systemConfig", "membership")).toBeUndefined();
    expect(backend.rollbackCount).toBe(1);
    expect(backend.commitAttempts).toBe(0);
  });
});

describe("6. commit成功後にレスポンスが失われた場合の呼び出し側リトライ", () => {
  it("calling tryBootstrapInitialAdmin twice in a row does not create a second admin", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    const backend = new FakeFirestoreBackend();
    installFetch(backend);
    const { tryBootstrapInitialAdmin } = await import("../login");

    const first = await tryBootstrapInitialAdmin("uid-1", "admin@example.com", "Admin");
    // 呼び出し元が(レスポンス消失等を疑い)同じ処理をもう一度実行したケースを模擬
    const second = await tryBootstrapInitialAdmin("uid-1", "admin@example.com", "Admin");

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(backend.get("systemConfig", "membership")?.fields.adminCount).toEqual({ integerValue: "1" });
  });

  it("calling claimInvitation twice in a row does not double-apply (second call throws ALREADY_CLAIMED)", async () => {
    const backend = new FakeFirestoreBackend();
    backend.seed("invitations", "inv-1", {
      emailLower: "a@example.com",
      status: "pending",
      role: "user",
      accountStatus: "active",
      contractStatus: "active",
      displayName: "",
      expiresAt: new Date(Date.now() + 1e9),
    });
    installFetch(backend);
    const { claimInvitation, InvitationError } = await import("../invitations");

    const params = { invitationId: "inv-1", uid: "uid-A", googleEmail: "a@example.com", displayName: "A" };
    await claimInvitation(params);
    await expect(claimInvitation(params)).rejects.toBeInstanceOf(InvitationError);
    await expect(claimInvitation(params)).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
  });
});
