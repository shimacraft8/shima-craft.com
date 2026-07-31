import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGIN = "https://shima-craft.com";
const HOST = "shima-craft.com";
const ORIGINAL_ENV = { ...process.env };

const getViewerMock = vi.fn();
const createExecutionMock = vi.fn();

vi.mock("@/lib/auth/access", () => ({
  getViewer: (...args: unknown[]) => getViewerMock(...args),
}));
vi.mock("@/lib/members/executions", () => ({
  createExecution: (...args: unknown[]) => createExecutionMock(...args),
}));

function postRequest(options: {
  body?: string;
  origin?: string | null;
  host?: string | null;
  cookie?: string;
} = {}): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.host !== null) headers.host = options.host ?? HOST;
  if (options.cookie) headers.cookie = options.cookie;
  return new NextRequest("https://shima-craft.com/api/colorize/executions", {
    method: "POST",
    headers,
    body: options.body ?? "{}",
  });
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.COLORIZE_ENABLED;
  delete process.env.COLORIZE_REQUIRE_LOGIN;
  getViewerMock.mockReset();
  createExecutionMock.mockReset();
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("POST /api/colorize/executions", () => {
  it("rejects a missing/mismatched Origin (CSRF)", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest({ origin: null }));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("BAD_ORIGIN");
  });

  it("returns 503 when COLORIZE_ENABLED=false", async () => {
    process.env.COLORIZE_ENABLED = "false";
    const { POST } = await import("../route");
    const res = await POST(postRequest());
    expect(res.status).toBe(503);
  });

  it("rejects an oversized body", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: JSON.stringify({ x: "a".repeat(2000) }) }));
    expect(res.status).toBe(413);
  });

  it("rejects malformed JSON", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest({ body: "{not json" }));
    expect(res.status).toBe(400);
  });

  describe("member path", () => {
    it("creates an execution for a member allowed to colorize", async () => {
      getViewerMock.mockResolvedValue({ kind: "member", canColorize: true, member: { uid: "uid-1" } });
      createExecutionMock.mockResolvedValue("exec-1");
      const { POST } = await import("../route");
      const res = await POST(postRequest({ body: JSON.stringify({ inputWidth: 100 }) }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({ ok: true, executionId: "exec-1", isMember: true });
    });

    it("rejects a member without an active contract (canColorize=false)", async () => {
      getViewerMock.mockResolvedValue({ kind: "member", canColorize: false, member: { uid: "uid-1" } });
      const { POST } = await import("../route");
      const res = await POST(postRequest());
      expect(res.status).toBe(403);
      expect((await res.json()).reason).toBe("NOT_ALLOWED");
      expect(createExecutionMock).not.toHaveBeenCalled();
    });

    it("returns 500 without leaking details when createExecution throws", async () => {
      getViewerMock.mockResolvedValue({ kind: "member", canColorize: true, member: { uid: "uid-1" } });
      createExecutionMock.mockRejectedValue(new Error("firestore boom"));
      const { POST } = await import("../route");
      const res = await POST(postRequest());
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).not.toMatch(/firestore boom/);
    });
  });

  describe("free-gate (anonymous) path", () => {
    beforeEach(() => {
      getViewerMock.mockResolvedValue({ kind: "anonymous" });
    });

    it("returns 401 when COLORIZE_REQUIRE_LOGIN=true (free gate disabled)", async () => {
      process.env.COLORIZE_REQUIRE_LOGIN = "true";
      const { POST } = await import("../route");
      const res = await POST(postRequest());
      expect(res.status).toBe(401);
    });

    it("allows the first request and returns remaining/used counts, no Firestore write", async () => {
      const { POST } = await import("../route");
      const res = await POST(postRequest());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({ ok: true, isMember: false, used: 1, remaining: 2 });
      expect(json.executionId).toMatch(/^anon-/);
      expect(createExecutionMock).not.toHaveBeenCalled();
    });

    it("returns 429 DAILY_LIMIT once the daily cap is exceeded", async () => {
      const { POST } = await import("../route");
      const { buildDailyCookieValue, FREE_DAILY_LIMIT } = await import("@/lib/colorization/freeGate");
      const jstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await POST(
        postRequest({ cookie: `colorize_daily=${buildDailyCookieValue(jstToday, FREE_DAILY_LIMIT)}` })
      );
      expect(res.status).toBe(429);
      expect((await res.json()).reason).toBe("DAILY_LIMIT");
    });

    describe("Set-Cookie Secure attribute (platform-aware, matches sc_session's isSecureCookieContext)", () => {
      it("omits Secure on local wrangler dev (CF_ENV=preview) even though NODE_ENV=production", async () => {
        Object.assign(process.env, { NODE_ENV: "production" });
        process.env.CF_ENV = "preview";
        const { POST } = await import("../route");
        const res = await POST(postRequest());
        const setCookie = res.headers.get("set-cookie") ?? "";
        expect(setCookie).toContain("colorize_daily=");
        expect(setCookie).not.toMatch(/secure/i);
      });

      it("includes Secure on real Cloudflare production (CF_ENV=production)", async () => {
        Object.assign(process.env, { NODE_ENV: "production" });
        process.env.CF_ENV = "production";
        const { POST } = await import("../route");
        const res = await POST(postRequest());
        expect(res.headers.get("set-cookie") ?? "").toMatch(/secure/i);
      });

      it("includes Secure on Vercel (CF_ENV unset, NODE_ENV=production)", async () => {
        Object.assign(process.env, { NODE_ENV: "production" });
        delete process.env.CF_ENV;
        const { POST } = await import("../route");
        const res = await POST(postRequest());
        expect(res.headers.get("set-cookie") ?? "").toMatch(/secure/i);
      });
    });
  });
});
