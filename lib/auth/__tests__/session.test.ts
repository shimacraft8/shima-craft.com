import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const lookupUserMock = vi.fn();
const createSessionCookieRestMock = vi.fn();
const verifyIdTokenRestMock = vi.fn();
const verifySessionCookieRestMock = vi.fn();

vi.mock("@/lib/firebase/rest/authAdmin", () => ({
  lookupUser: (...args: unknown[]) => lookupUserMock(...args),
  createSessionCookie: (...args: unknown[]) => createSessionCookieRestMock(...args),
}));
vi.mock("@/lib/firebase/rest/idToken", () => ({
  verifyIdToken: (...args: unknown[]) => verifyIdTokenRestMock(...args),
}));
vi.mock("@/lib/firebase/rest/sessionCookie", () => ({
  verifySessionCookie: (...args: unknown[]) => verifySessionCookieRestMock(...args),
}));

function baseDecoded(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    uid: "user-1",
    sub: "user-1",
    aud: "test-project",
    iss: "https://securetoken.google.com/test-project",
    iat: now - 5,
    exp: now + 3600,
    auth_time: now - 5,
    ...overrides,
  };
}

describe("lib/auth/session", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: "test-project" };
    lookupUserMock.mockReset();
    createSessionCookieRestMock.mockReset();
    verifyIdTokenRestMock.mockReset();
    verifySessionCookieRestMock.mockReset();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe("verifyIdTokenStrict", () => {
    it("returns the decoded token for a valid, non-disabled, fresh-login token", async () => {
      verifyIdTokenRestMock.mockResolvedValue(baseDecoded());
      lookupUserMock.mockResolvedValue({ localId: "user-1", disabled: false, validSinceSeconds: 0, customAttributes: null });
      const { verifyIdTokenStrict } = await import("../session");
      const decoded = await verifyIdTokenStrict("some-id-token");
      expect(decoded.uid).toBe("user-1");
    });

    it("throws StaleAuthTimeError when auth_time is older than 5 minutes", async () => {
      const now = Math.floor(Date.now() / 1000);
      verifyIdTokenRestMock.mockResolvedValue(baseDecoded({ auth_time: now - 6 * 60 }));
      lookupUserMock.mockResolvedValue({ localId: "user-1", disabled: false, validSinceSeconds: 0, customAttributes: null });
      const { verifyIdTokenStrict, StaleAuthTimeError } = await import("../session");
      await expect(verifyIdTokenStrict("some-id-token")).rejects.toThrow(StaleAuthTimeError);
    });

    it("accepts auth_time just inside the 5 minute boundary", async () => {
      const now = Math.floor(Date.now() / 1000);
      // 境界（300秒）そのものは実行時のミリ秒経過で揺れうるため、余裕を持って299秒とする。
      verifyIdTokenRestMock.mockResolvedValue(baseDecoded({ auth_time: now - (5 * 60 - 1) }));
      lookupUserMock.mockResolvedValue({ localId: "user-1", disabled: false, validSinceSeconds: 0, customAttributes: null });
      const { verifyIdTokenStrict } = await import("../session");
      await expect(verifyIdTokenStrict("some-id-token")).resolves.toBeTruthy();
    });

    it("rejects a disabled user", async () => {
      verifyIdTokenRestMock.mockResolvedValue(baseDecoded());
      lookupUserMock.mockResolvedValue({ localId: "user-1", disabled: true, validSinceSeconds: 0, customAttributes: null });
      const { verifyIdTokenStrict } = await import("../session");
      await expect(verifyIdTokenStrict("some-id-token")).rejects.toThrow(/disabled/);
    });

    it("rejects a token issued before the most recent revocation (validSince)", async () => {
      const now = Math.floor(Date.now() / 1000);
      verifyIdTokenRestMock.mockResolvedValue(baseDecoded({ iat: now - 100 }));
      lookupUserMock.mockResolvedValue({ localId: "user-1", disabled: false, validSinceSeconds: now, customAttributes: null });
      const { verifyIdTokenStrict } = await import("../session");
      await expect(verifyIdTokenStrict("some-id-token")).rejects.toThrow(/revocation/);
    });

    it("rejects when the user no longer exists", async () => {
      verifyIdTokenRestMock.mockResolvedValue(baseDecoded());
      lookupUserMock.mockResolvedValue(null);
      const { verifyIdTokenStrict } = await import("../session");
      await expect(verifyIdTokenStrict("some-id-token")).rejects.toThrow(/not found|disabled/);
    });

    it("propagates failure when accounts:lookup itself errors (fails closed)", async () => {
      verifyIdTokenRestMock.mockResolvedValue(baseDecoded());
      lookupUserMock.mockRejectedValue(new Error("network error"));
      const { verifyIdTokenStrict } = await import("../session");
      await expect(verifyIdTokenStrict("some-id-token")).rejects.toThrow();
    });

    it("propagates a malformed/expired/tampered token rejection from the JWT layer", async () => {
      verifyIdTokenRestMock.mockRejectedValue(new Error("signature verification failed"));
      const { verifyIdTokenStrict } = await import("../session");
      await expect(verifyIdTokenStrict("bad-token")).rejects.toThrow(/signature/);
      expect(lookupUserMock).not.toHaveBeenCalled();
    });
  });

  describe("createSessionCookieFromIdToken", () => {
    it("requests the official createSessionCookie REST call with the existing SESSION_DURATION_MS", async () => {
      createSessionCookieRestMock.mockResolvedValue("the-cookie-value");
      const { createSessionCookieFromIdToken, SESSION_DURATION_MS } = await import("../session");
      const cookie = await createSessionCookieFromIdToken("id-token");
      expect(cookie).toBe("the-cookie-value");
      expect(createSessionCookieRestMock).toHaveBeenCalledWith("id-token", SESSION_DURATION_MS);
      expect(SESSION_DURATION_MS).toBe(5 * 24 * 60 * 60 * 1000);
    });

    it("propagates createSessionCookie failures (401/403/429/500/timeout) without swallowing them", async () => {
      createSessionCookieRestMock.mockRejectedValue(new Error("createSessionCookie failed: HTTP 429"));
      const { createSessionCookieFromIdToken } = await import("../session");
      await expect(createSessionCookieFromIdToken("id-token")).rejects.toThrow(/429/);
    });
  });

  describe("verifySessionCookie / getVerifiedSession", () => {
    it("delegates verification to the REST session cookie module", async () => {
      verifySessionCookieRestMock.mockResolvedValue({ uid: "user-1" });
      const { verifySessionCookie } = await import("../session");
      const decoded = await verifySessionCookie("cookie-value");
      expect(decoded).toEqual({ uid: "user-1" });
      expect(verifySessionCookieRestMock).toHaveBeenCalledWith("cookie-value");
    });

    it("getVerifiedSession returns null when there is no cookie in the store", async () => {
      vi.doMock("next/headers", () => ({
        cookies: () => ({ get: () => undefined, set: vi.fn() }),
      }));
      process.env.FIREBASE_CLIENT_EMAIL = "sa@example.com";
      process.env.FIREBASE_PRIVATE_KEY = "dummy";
      const { getVerifiedSession } = await import("../session");
      expect(await getVerifiedSession()).toBeNull();
      expect(verifySessionCookieRestMock).not.toHaveBeenCalled();
    });

    it("getVerifiedSession returns null when Firebase is not configured (graceful degradation)", async () => {
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;
      vi.doMock("next/headers", () => ({
        cookies: () => ({ get: () => ({ value: "some-cookie" }), set: vi.fn() }),
      }));
      const { getVerifiedSession } = await import("../session");
      expect(await getVerifiedSession()).toBeNull();
      expect(verifySessionCookieRestMock).not.toHaveBeenCalled();
    });
  });

  describe("Cookie attributes", () => {
    it("setSessionCookieOnStore uses the existing name/attributes/duration unchanged", async () => {
      const setMock = vi.fn();
      vi.doMock("next/headers", () => ({ cookies: () => ({ set: setMock, get: vi.fn() }) }));
      const { setSessionCookieOnStore, SESSION_COOKIE_NAME, SESSION_DURATION_MS } = await import("../session");
      setSessionCookieOnStore("cookie-value");
      expect(setMock).toHaveBeenCalledWith(SESSION_COOKIE_NAME, "cookie-value", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" && process.env.CF_ENV !== "preview",
        sameSite: "lax",
        path: "/",
        maxAge: Math.floor(SESSION_DURATION_MS / 1000),
      });
      expect(SESSION_COOKIE_NAME).toBe("sc_session");
    });

    it("forces secure=false on Cloudflare local wrangler dev (CF_ENV=preview) even when NODE_ENV=production", async () => {
      // NODE_ENVは@types/nodeでreadonly宣言のため直接代入不可。Object.assignで回避。
      Object.assign(process.env, { NODE_ENV: "production" });
      process.env.CF_ENV = "preview";
      const setMock = vi.fn();
      vi.doMock("next/headers", () => ({ cookies: () => ({ set: setMock, get: vi.fn() }) }));
      const { setSessionCookieOnStore, SESSION_COOKIE_NAME } = await import("../session");
      setSessionCookieOnStore("cookie-value");
      const [, , options] = setMock.mock.calls[0] as [string, string, { secure: boolean }];
      expect(options.secure).toBe(false);
      void SESSION_COOKIE_NAME;
    });

    it("keeps secure=true on Cloudflare production (CF_ENV=production)", async () => {
      Object.assign(process.env, { NODE_ENV: "production" });
      process.env.CF_ENV = "production";
      const setMock = vi.fn();
      vi.doMock("next/headers", () => ({ cookies: () => ({ set: setMock, get: vi.fn() }) }));
      const { setSessionCookieOnStore } = await import("../session");
      setSessionCookieOnStore("cookie-value");
      const [, , options] = setMock.mock.calls[0] as [string, string, { secure: boolean }];
      expect(options.secure).toBe(true);
    });

    it("keeps secure=true on Vercel (CF_ENV unset, NODE_ENV=production)", async () => {
      Object.assign(process.env, { NODE_ENV: "production" });
      delete process.env.CF_ENV;
      const setMock = vi.fn();
      vi.doMock("next/headers", () => ({ cookies: () => ({ set: setMock, get: vi.fn() }) }));
      const { setSessionCookieOnStore } = await import("../session");
      setSessionCookieOnStore("cookie-value");
      const [, , options] = setMock.mock.calls[0] as [string, string, { secure: boolean }];
      expect(options.secure).toBe(true);
    });

    it("clearSessionCookieOnStore uses the same name/path/sameSite/httpOnly as set, with maxAge=0", async () => {
      const setMock = vi.fn();
      vi.doMock("next/headers", () => ({ cookies: () => ({ set: setMock, get: vi.fn() }) }));
      const { clearSessionCookieOnStore, SESSION_COOKIE_NAME } = await import("../session");
      clearSessionCookieOnStore();
      expect(setMock).toHaveBeenCalledWith(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" && process.env.CF_ENV !== "preview",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    });
  });
});
