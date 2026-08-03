import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ORIGIN = "https://shima-craft.com";
const HOST = "shima-craft.com";
const ORIGINAL_ENV = { ...process.env };

const checkColorizeIpLimitMock = vi.fn();
const incrementColorizeIpCountMock = vi.fn();

vi.mock("@/lib/rateLimit/colorizeIpLimit", () => ({
  checkColorizeIpLimit: (...args: unknown[]) => checkColorizeIpLimitMock(...args),
  incrementColorizeIpCount: (...args: unknown[]) => incrementColorizeIpCountMock(...args),
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
  checkColorizeIpLimitMock.mockReset().mockResolvedValue({ limited: false });
  incrementColorizeIpCountMock.mockReset().mockResolvedValue(undefined);
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

  it("allows the first request and returns remaining/used counts, no login/account required", async () => {
    const { POST } = await import("../route");
    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, used: 1, remaining: 2 });
    expect(json.executionId).toMatch(/^anon-/);
  });

  it("increments the IP-hash counter only when the request is actually allowed", async () => {
    const { POST } = await import("../route");
    await POST(postRequest());
    expect(incrementColorizeIpCountMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 DAILY_LIMIT with Retry-After once the daily cookie cap is exceeded", async () => {
    const { POST } = await import("../route");
    const { buildDailyCookieValue, FREE_DAILY_LIMIT } = await import("@/lib/colorization/freeGate");
    const jstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await POST(
      postRequest({ cookie: `colorize_daily=${buildDailyCookieValue(jstToday, FREE_DAILY_LIMIT)}` })
    );
    expect(res.status).toBe(429);
    expect((await res.json()).reason).toBe("DAILY_LIMIT");
    expect(res.headers.get("retry-after")).toBeTruthy();
    // Cookie側で既に拒否されているので、IPカウンタは増やさない
    expect(incrementColorizeIpCountMock).not.toHaveBeenCalled();
  });

  it("returns 429 DAILY_LIMIT with Retry-After when the IP-hash+KV auxiliary limit is hit (Cookie削除だけでは無制限にならない)", async () => {
    checkColorizeIpLimitMock.mockResolvedValue({ limited: true, retryAfterSeconds: 1234 });
    const { POST } = await import("../route");
    const res = await POST(postRequest());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.reason).toBe("DAILY_LIMIT");
    expect(res.headers.get("retry-after")).toBe("1234");
    expect(incrementColorizeIpCountMock).not.toHaveBeenCalled();
  });

  describe("Set-Cookie Secure attribute (platform-aware, matches isSecureCookieContext)", () => {
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
