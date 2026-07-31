import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const runFirestoreTransactionMock = vi.fn();
const setCustomUserClaimsMock = vi.fn();
const getMemberMock = vi.fn();
const touchLastLoginMock = vi.fn();
const claimInvitationMock = vi.fn();
const findInvitationByTokenMock = vi.fn();

vi.mock("@/lib/firebase/rest/firestore", () => ({
  runFirestoreTransaction: (...args: unknown[]) => runFirestoreTransactionMock(...args),
}));
vi.mock("@/lib/firebase/rest/authAdmin", () => ({
  setCustomUserClaims: (...args: unknown[]) => setCustomUserClaimsMock(...args),
}));
vi.mock("../repo", async () => {
  const actual = await vi.importActual<typeof import("../repo")>("../repo");
  return {
    ...actual,
    getMember: (...args: unknown[]) => getMemberMock(...args),
    touchLastLogin: (...args: unknown[]) => touchLastLoginMock(...args),
  };
});
vi.mock("../invitations", () => ({
  claimInvitation: (...args: unknown[]) => claimInvitationMock(...args),
  findInvitationByToken: (...args: unknown[]) => findInvitationByTokenMock(...args),
}));

function baseDecoded(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    uid: "user-1",
    email: "a@example.com",
    email_verified: true,
    name: "Taro",
    auth_time: now - 5,
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  runFirestoreTransactionMock.mockReset();
  setCustomUserClaimsMock.mockReset();
  getMemberMock.mockReset();
  touchLastLoginMock.mockReset();
  claimInvitationMock.mockReset();
  findInvitationByTokenMock.mockReset();
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("resolveLogin", () => {
  it("rejects with STALE_AUTH when auth_time is older than MAX_AUTH_AGE_SECONDS", async () => {
    const now = Math.floor(Date.now() / 1000);
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded({ auth_time: now - 6 * 60 }), null);
    expect(result).toEqual({ ok: false, reason: "STALE_AUTH" });
    expect(getMemberMock).not.toHaveBeenCalled();
  });

  it("logs in an existing active member and touches lastLogin", async () => {
    getMemberMock.mockResolvedValue({ uid: "user-1", accountStatus: "active" });
    touchLastLoginMock.mockResolvedValue(undefined);
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded(), null);
    expect(result).toEqual({ ok: true, uid: "user-1" });
    expect(touchLastLoginMock).toHaveBeenCalledWith("user-1");
  });

  it("rejects an existing non-active member with SUSPENDED", async () => {
    getMemberMock.mockResolvedValue({ uid: "user-1", accountStatus: "suspended" });
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded(), null);
    expect(result).toEqual({ ok: false, reason: "SUSPENDED" });
    expect(touchLastLoginMock).not.toHaveBeenCalled();
  });

  it("rejects a new user whose Google email is not verified", async () => {
    getMemberMock.mockResolvedValue(null);
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded({ email_verified: false }), null);
    expect(result).toEqual({ ok: false, reason: "NOT_REGISTERED" });
  });

  it("claims a valid invitation for a new user", async () => {
    getMemberMock.mockResolvedValue(null);
    findInvitationByTokenMock.mockResolvedValue({ id: "inv-1", invitation: {} });
    claimInvitationMock.mockResolvedValue({ role: "user" });
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded(), "raw-token");
    expect(result).toEqual({ ok: true, uid: "user-1" });
    expect(claimInvitationMock).toHaveBeenCalledWith({
      invitationId: "inv-1",
      uid: "user-1",
      googleEmail: "a@example.com",
      displayName: "Taro",
    });
  });

  it("rejects with INVALID_INVITATION when the token does not resolve to any invitation", async () => {
    getMemberMock.mockResolvedValue(null);
    findInvitationByTokenMock.mockResolvedValue(null);
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded(), "bad-token");
    expect(result).toEqual({ ok: false, reason: "INVALID_INVITATION" });
    expect(claimInvitationMock).not.toHaveBeenCalled();
  });

  it("rejects with INVALID_INVITATION when claimInvitation itself throws (expired/revoked/mismatch)", async () => {
    getMemberMock.mockResolvedValue(null);
    findInvitationByTokenMock.mockResolvedValue({ id: "inv-1", invitation: {} });
    claimInvitationMock.mockRejectedValue(new Error("expired"));
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded(), "raw-token");
    expect(result).toEqual({ ok: false, reason: "INVALID_INVITATION" });
  });

  it("bootstraps the initial admin for a new user with no invitation when the email matches", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "a@example.com";
    getMemberMock.mockResolvedValue(null);
    runFirestoreTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<boolean>) => {
      const tx = {
        get: vi.fn(async () => null),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      return fn(tx);
    });
    setCustomUserClaimsMock.mockResolvedValue(undefined);
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded(), null);
    expect(result).toEqual({ ok: true, uid: "user-1" });
  });

  it("rejects a new user with no invitation and no bootstrap match with NOT_REGISTERED", async () => {
    getMemberMock.mockResolvedValue(null);
    const { resolveLogin } = await import("../login");
    const result = await resolveLogin(baseDecoded(), null);
    expect(result).toEqual({ ok: false, reason: "NOT_REGISTERED" });
    expect(runFirestoreTransactionMock).not.toHaveBeenCalled();
  });
});

describe("tryBootstrapInitialAdmin", () => {
  it("returns false immediately when INITIAL_ADMIN_EMAIL is not configured", async () => {
    delete process.env.INITIAL_ADMIN_EMAIL;
    const { tryBootstrapInitialAdmin } = await import("../login");
    expect(await tryBootstrapInitialAdmin("uid-1", "a@example.com", "Taro")).toBe(false);
    expect(runFirestoreTransactionMock).not.toHaveBeenCalled();
  });

  it("returns false when the email does not match INITIAL_ADMIN_EMAIL", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    const { tryBootstrapInitialAdmin } = await import("../login");
    expect(await tryBootstrapInitialAdmin("uid-1", "someone-else@example.com", "Taro")).toBe(false);
    expect(runFirestoreTransactionMock).not.toHaveBeenCalled();
  });

  it("does not create a second admin when bootstrapCompleted is already true", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    const setMock = vi.fn();
    runFirestoreTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<boolean>) => {
      const tx = {
        get: vi.fn(async (collectionId: string) => {
          if (collectionId === "systemConfig") return { id: "membership", data: { bootstrapCompleted: true } };
          return null;
        }),
        set: setMock,
        update: vi.fn(),
        delete: vi.fn(),
      };
      return fn(tx);
    });
    const { tryBootstrapInitialAdmin } = await import("../login");
    const created = await tryBootstrapInitialAdmin("uid-1", "admin@example.com", "Admin");
    expect(created).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing member document", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    const setMock = vi.fn();
    runFirestoreTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<boolean>) => {
      const tx = {
        get: vi.fn(async (collectionId: string) => {
          if (collectionId === "members") return { id: "uid-1", data: { role: "user" } };
          return null;
        }),
        set: setMock,
        update: vi.fn(),
        delete: vi.fn(),
      };
      return fn(tx);
    });
    const { tryBootstrapInitialAdmin } = await import("../login");
    expect(await tryBootstrapInitialAdmin("uid-1", "admin@example.com", "Admin")).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("creates the admin member + updates systemConfig atomically, then sets the custom claim", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    const setCalls: Array<[string, string, Record<string, unknown>, unknown?]> = [];
    runFirestoreTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<boolean>) => {
      const tx = {
        get: vi.fn(async () => null),
        set: vi.fn((...args: [string, string, Record<string, unknown>, unknown?]) => setCalls.push(args)),
        update: vi.fn(),
        delete: vi.fn(),
      };
      return fn(tx);
    });
    setCustomUserClaimsMock.mockResolvedValue(undefined);

    const { tryBootstrapInitialAdmin } = await import("../login");
    const created = await tryBootstrapInitialAdmin("uid-1", "admin@example.com", "");

    expect(created).toBe(true);
    expect(setCalls).toHaveLength(2);
    const [memberCall, configCall] = setCalls;
    expect(memberCall[0]).toBe("members");
    expect(memberCall[1]).toBe("uid-1");
    expect((memberCall[2] as Record<string, unknown>).role).toBe("admin");
    expect((memberCall[2] as Record<string, unknown>).displayName).toBe("SHIMA CRAFT 管理者");
    expect(configCall[0]).toBe("systemConfig");
    expect(configCall[3]).toEqual({ merge: true });
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith("uid-1", { role: "admin" });
  });

  it("still returns true even if setCustomUserClaims fails afterward (Firestore is the source of truth)", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "admin@example.com";
    runFirestoreTransactionMock.mockImplementation(async (fn: (tx: unknown) => Promise<boolean>) => {
      const tx = { get: vi.fn(async () => null), set: vi.fn(), update: vi.fn(), delete: vi.fn() };
      return fn(tx);
    });
    setCustomUserClaimsMock.mockRejectedValue(new Error("network error"));
    const { tryBootstrapInitialAdmin } = await import("../login");
    await expect(tryBootstrapInitialAdmin("uid-1", "admin@example.com", "")).resolves.toBe(true);
  });
});
