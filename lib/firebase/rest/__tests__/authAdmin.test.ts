import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

vi.mock("../googleAuth", () => ({
  getServiceAccountAccessToken: vi.fn(async () => "fake-access-token"),
}));

describe("createSessionCookie", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: "test-project" };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("calls the official createSessionCookie endpoint with a bearer token and returns the cookie", async () => {
    let capturedUrl = "";
    let capturedAuth = "";
    let capturedBody: unknown = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        capturedUrl = url;
        capturedAuth = (init.headers as Record<string, string>).Authorization;
        capturedBody = JSON.parse(init.body as string);
        return new Response(JSON.stringify({ sessionCookie: "the-session-cookie" }), { status: 200 });
      })
    );

    const { createSessionCookie } = await import("../authAdmin");
    const cookie = await createSessionCookie("some-id-token", 5 * 24 * 60 * 60 * 1000);

    expect(cookie).toBe("the-session-cookie");
    expect(capturedUrl).toBe("https://identitytoolkit.googleapis.com/v1/projects/test-project:createSessionCookie");
    expect(capturedAuth).toBe("Bearer fake-access-token");
    expect(capturedBody).toEqual({ idToken: "some-id-token", validDuration: String(5 * 24 * 60 * 60) });
  });

  it("rejects a validDuration below 5 minutes", async () => {
    const { createSessionCookie } = await import("../authAdmin");
    await expect(createSessionCookie("token", 60 * 1000)).rejects.toThrow(/validDuration/);
  });

  it("rejects a validDuration above 14 days", async () => {
    const { createSessionCookie } = await import("../authAdmin");
    await expect(createSessionCookie("token", 15 * 24 * 60 * 60 * 1000)).rejects.toThrow(/validDuration/);
  });

  it("throws IdentityToolkitError (without leaking response body) when Google rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "INVALID_ID_TOKEN" } }), { status: 400 })));
    const { createSessionCookie, IdentityToolkitError } = await import("../authAdmin");
    await expect(createSessionCookie("bad-token", 5 * 24 * 60 * 60 * 1000)).rejects.toThrow(IdentityToolkitError);
  });

  it("does not leak the raw response body text in the thrown error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("SECRET_INTERNAL_DETAIL", { status: 400 })));
    const { createSessionCookie } = await import("../authAdmin");
    try {
      await createSessionCookie("bad-token", 5 * 24 * 60 * 60 * 1000);
      expect.unreachable("expected createSessionCookie to throw");
    } catch (e) {
      expect((e as Error).message).not.toContain("SECRET_INTERNAL_DETAIL");
    }
  });

  it("does not issue an empty cookie when the response is 200 but malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 200 })));
    const { createSessionCookie } = await import("../authAdmin");
    await expect(createSessionCookie("token", 5 * 24 * 60 * 60 * 1000)).rejects.toThrow(/not valid JSON/i);
  });

  it("does not issue an empty cookie when the response is 200 but missing sessionCookie", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
    const { createSessionCookie } = await import("../authAdmin");
    await expect(createSessionCookie("token", 5 * 24 * 60 * 60 * 1000)).rejects.toThrow(/missing sessionCookie/i);
  });

  it("fails closed on a timeout while creating the session cookie", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("aborted", "TimeoutError");
      })
    );
    const { createSessionCookie } = await import("../authAdmin");
    await expect(createSessionCookie("token", 5 * 24 * 60 * 60 * 1000)).rejects.toThrow(/timed out/i);
  });

  it("throws when FIREBASE_PROJECT_ID is not configured", async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    const { createSessionCookie } = await import("../authAdmin");
    await expect(createSessionCookie("token", 5 * 24 * 60 * 60 * 1000)).rejects.toThrow("FIREBASE_PROJECT_ID");
  });
});

describe("lookupUser", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: "test-project" };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("parses validSince (string seconds), disabled, and customAttributes from the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            users: [
              {
                localId: "user-1",
                disabled: true,
                validSince: "1700000000",
                customAttributes: JSON.stringify({ role: "admin" }),
              },
            ],
          }),
          { status: 200 }
        )
      )
    );
    const { lookupUser } = await import("../authAdmin");
    const result = await lookupUser("user-1");
    expect(result).toEqual({
      localId: "user-1",
      disabled: true,
      validSinceSeconds: 1700000000,
      customAttributes: { role: "admin" },
    });
  });

  it("returns null when no user is found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
    const { lookupUser } = await import("../authAdmin");
    expect(await lookupUser("missing-uid")).toBeNull();
  });

  it("defaults disabled=false and validSince=0 when absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ users: [{ localId: "user-2" }] }), { status: 200 }))
    );
    const { lookupUser } = await import("../authAdmin");
    const result = await lookupUser("user-2");
    expect(result).toEqual({ localId: "user-2", disabled: false, validSinceSeconds: 0, customAttributes: null });
  });

  it("fails closed on a timeout during accounts:lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("aborted", "TimeoutError");
      })
    );
    const { lookupUser } = await import("../authAdmin");
    await expect(lookupUser("user-1")).rejects.toThrow(/timed out/i);
  });

  it("throws (rather than silently returning null) on a 5xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("server error", { status: 503 })));
    const { lookupUser } = await import("../authAdmin");
    await expect(lookupUser("user-1")).rejects.toThrow(/HTTP 503/);
  });
});
