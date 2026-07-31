import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGIN = "https://shima-craft.com";
const HOST = "shima-craft.com";

const verifyIdTokenStrictMock = vi.fn();
const createSessionCookieFromIdTokenMock = vi.fn();
const getVerifiedSessionMock = vi.fn();
const resolveLoginMock = vi.fn();
const revokeAllRefreshTokensMock = vi.fn();
const setSessionCookieOnStoreMock = vi.fn();
const clearSessionCookieOnStoreMock = vi.fn();
const checkLoginRateLimitMock = vi.fn();

class FakeStaleAuthTimeError extends Error {
  constructor() {
    super("stale");
    this.name = "StaleAuthTimeError";
  }
}

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>("@/lib/auth/session");
  return {
    ...actual,
    verifyIdTokenStrict: (...args: unknown[]) => verifyIdTokenStrictMock(...args),
    createSessionCookieFromIdToken: (...args: unknown[]) => createSessionCookieFromIdTokenMock(...args),
    getVerifiedSession: (...args: unknown[]) => getVerifiedSessionMock(...args),
    setSessionCookieOnStore: (...args: unknown[]) => setSessionCookieOnStoreMock(...args),
    clearSessionCookieOnStore: (...args: unknown[]) => clearSessionCookieOnStoreMock(...args),
    StaleAuthTimeError: FakeStaleAuthTimeError,
  };
});
vi.mock("@/lib/members/login", () => ({
  resolveLogin: (...args: unknown[]) => resolveLoginMock(...args),
}));
vi.mock("@/lib/firebase/rest/authAdmin", () => ({
  revokeAllRefreshTokens: (...args: unknown[]) => revokeAllRefreshTokensMock(...args),
}));
vi.mock("@/lib/rateLimit/loginRateLimit", () => ({
  checkLoginRateLimit: (...args: unknown[]) => checkLoginRateLimitMock(...args),
}));

function postRequest(options: {
  body?: string;
  contentType?: string | null;
  origin?: string | null;
  host?: string | null;
}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.contentType !== null) headers["content-type"] = options.contentType ?? "application/json";
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.host !== null) headers.host = options.host ?? HOST;
  return new NextRequest("https://shima-craft.com/api/auth/session", {
    method: "POST",
    headers,
    body: options.body,
  });
}

function deleteRequest(options: { origin?: string | null; host?: string | null } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.host !== null) headers.host = options.host ?? HOST;
  return new NextRequest("https://shima-craft.com/api/auth/session", { method: "DELETE", headers });
}

describe("POST /api/auth/session", () => {
  beforeEach(() => {
    vi.resetModules();
    verifyIdTokenStrictMock.mockReset();
    createSessionCookieFromIdTokenMock.mockReset();
    resolveLoginMock.mockReset();
    setSessionCookieOnStoreMock.mockReset();
    checkLoginRateLimitMock.mockReset().mockResolvedValue({ limited: false });
  });

  it("rejects a missing Origin header (CSRF)", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "x" }), origin: null }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("BAD_ORIGIN");
  });

  it("rejects an Origin that does not match Host", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      postRequest({ body: JSON.stringify({ idToken: "x" }), origin: "https://evil.example.com" })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("BAD_ORIGIN");
  });

  it("rejects a non-JSON Content-Type", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      postRequest({ body: JSON.stringify({ idToken: "x" }), contentType: "text/plain" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("INVALID_CONTENT_TYPE");
  });

  it("rejects an empty body", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("INVALID_JSON");
  });

  it("rejects a body exceeding the maximum size", async () => {
    const hugeToken = "a".repeat(20 * 1024);
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: hugeToken }) }));
    expect(res.status).toBe(413);
    expect((await res.json()).reason).toBe("BODY_TOO_LARGE");
  });

  it("rejects malformed JSON", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("INVALID_JSON");
  });

  it("rejects a missing idToken field", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("INVALID_TOKEN");
  });

  it("returns 401 INVALID_TOKEN for an expired/tampered/invalid ID token", async () => {
    verifyIdTokenStrictMock.mockRejectedValue(new Error("signature verification failed"));
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "bad" }) }));
    expect(res.status).toBe(401);
    expect((await res.json()).reason).toBe("INVALID_TOKEN");
  });

  it("returns 401 STALE_AUTH (distinct from INVALID_TOKEN) when auth_time is too old", async () => {
    verifyIdTokenStrictMock.mockRejectedValue(new FakeStaleAuthTimeError());
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "old" }) }));
    expect(res.status).toBe(401);
    expect((await res.json()).reason).toBe("STALE_AUTH");
  });

  it("does not set a cookie when resolveLogin rejects the user", async () => {
    verifyIdTokenStrictMock.mockResolvedValue({ uid: "user-1" });
    resolveLoginMock.mockResolvedValue({ ok: false, reason: "NOT_REGISTERED" });
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "good" }) }));
    expect(res.status).toBe(403);
    expect(setSessionCookieOnStoreMock).not.toHaveBeenCalled();
  });

  it("returns a distinct 503 (not a crash) when the Firestore-dependent membership check is unavailable", async () => {
    verifyIdTokenStrictMock.mockResolvedValue({ uid: "user-1" });
    resolveLoginMock.mockRejectedValue(new EvalError("Code generation from strings disallowed for this context"));
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "good" }) }));
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("MEMBERSHIP_CHECK_UNAVAILABLE");
    expect(setSessionCookieOnStoreMock).not.toHaveBeenCalled();
  });

  it("does not set a cookie when createSessionCookie fails (401/403/429/500/timeout)", async () => {
    verifyIdTokenStrictMock.mockResolvedValue({ uid: "user-1" });
    resolveLoginMock.mockResolvedValue({ ok: true, uid: "user-1" });
    createSessionCookieFromIdTokenMock.mockRejectedValue(new Error("createSessionCookie failed: HTTP 429"));
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "good" }) }));
    expect(res.status).toBe(500);
    expect(setSessionCookieOnStoreMock).not.toHaveBeenCalled();
  });

  it("sets the cookie only when everything succeeds", async () => {
    verifyIdTokenStrictMock.mockResolvedValue({ uid: "user-1" });
    resolveLoginMock.mockResolvedValue({ ok: true, uid: "user-1" });
    createSessionCookieFromIdTokenMock.mockResolvedValue("the-session-cookie");
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "good", invitationToken: "inv" }) }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(setSessionCookieOnStoreMock).toHaveBeenCalledWith("the-session-cookie");
  });

  it("returns 429 with Retry-After when the login rate limit is exceeded, before touching idToken verification", async () => {
    checkLoginRateLimitMock.mockResolvedValue({ limited: true, retryAfterSeconds: 42 });
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ idToken: "good" }) }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect((await res.json()).reason).toBe("RATE_LIMITED");
    expect(verifyIdTokenStrictMock).not.toHaveBeenCalled();
  });

  it("does not expose a GET handler for session issuance", async () => {
    const routeModule = await import("../route");
    expect((routeModule as Record<string, unknown>).GET).toBeUndefined();
  });
});

describe("DELETE /api/auth/session (logout)", () => {
  beforeEach(() => {
    vi.resetModules();
    getVerifiedSessionMock.mockReset();
    revokeAllRefreshTokensMock.mockReset();
    clearSessionCookieOnStoreMock.mockReset();
  });

  it("rejects a missing Origin header (CSRF)", async () => {
    const { DELETE } = await import("../route");
    const res = await DELETE(deleteRequest({ origin: null }));
    expect(res.status).toBe(403);
    expect(clearSessionCookieOnStoreMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatched Origin/Host (CSRF)", async () => {
    const { DELETE } = await import("../route");
    const res = await DELETE(deleteRequest({ origin: "https://evil.example.com" }));
    expect(res.status).toBe(403);
    expect(clearSessionCookieOnStoreMock).not.toHaveBeenCalled();
  });

  it("revokes all refresh tokens and clears the cookie for a logged-in user", async () => {
    getVerifiedSessionMock.mockResolvedValue({ uid: "user-1" });
    revokeAllRefreshTokensMock.mockResolvedValue(undefined);
    const { DELETE } = await import("../route");
    const res = await DELETE(deleteRequest());
    expect(res.status).toBe(200);
    expect(revokeAllRefreshTokensMock).toHaveBeenCalledWith("user-1");
    expect(clearSessionCookieOnStoreMock).toHaveBeenCalledTimes(1);
  });

  it("still clears the cookie even if there is no active session", async () => {
    getVerifiedSessionMock.mockResolvedValue(null);
    const { DELETE } = await import("../route");
    const res = await DELETE(deleteRequest());
    expect(res.status).toBe(200);
    expect(revokeAllRefreshTokensMock).not.toHaveBeenCalled();
    expect(clearSessionCookieOnStoreMock).toHaveBeenCalledTimes(1);
  });

  it("clears the cookie even if revokeAllRefreshTokens itself fails", async () => {
    getVerifiedSessionMock.mockResolvedValue({ uid: "user-1" });
    revokeAllRefreshTokensMock.mockRejectedValue(new Error("network error"));
    const { DELETE } = await import("../route");
    const res = await DELETE(deleteRequest());
    expect(res.status).toBe(200);
    expect(clearSessionCookieOnStoreMock).toHaveBeenCalledTimes(1);
  });

  it("does not expose a GET handler for logout", async () => {
    const routeModule = await import("../route");
    expect((routeModule as Record<string, unknown>).GET).toBeUndefined();
  });
});
