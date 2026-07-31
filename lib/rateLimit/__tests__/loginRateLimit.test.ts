import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const ipHashFromHeadersMock = vi.fn();

vi.mock("@/lib/members/tokens", () => ({
  ipHashFromHeaders: (...args: unknown[]) => ipHashFromHeadersMock(...args),
}));

function headersWithIp(ip = "203.0.113.42"): Headers {
  return new Headers({ "x-forwarded-for": ip });
}

function fakeKv() {
  const store = new Map<string, string>();
  const puts: Array<{ key: string; value: string; options?: { expirationTtl?: number } }> = [];
  return {
    kv: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
        store.set(key, value);
        puts.push({ key, value, options });
      }),
    },
    puts,
  };
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, CF_ENV: "preview" };
  ipHashFromHeadersMock.mockReset().mockReturnValue("ip-hash-default");
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.doUnmock("@opennextjs/cloudflare");
});

describe("checkLoginRateLimit", () => {
  it("always allows when ipHashFromHeaders returns null (IP not determinable)", async () => {
    ipHashFromHeadersMock.mockReturnValue(null);
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    expect(await checkLoginRateLimit(headersWithIp())).toEqual({ limited: false });
  });

  it("fails open (allows) when ipHashFromHeaders itself throws (e.g. LOG_IP_HASH_SALT not configured) — must never break login", async () => {
    ipHashFromHeadersMock.mockImplementation(() => {
      throw new Error("invitation secret is not configured");
    });
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    await expect(checkLoginRateLimit(headersWithIp())).resolves.toEqual({ limited: false });
  });

  it("always allows on non-Cloudflare platforms (CF_ENV unset, e.g. Vercel)", async () => {
    delete process.env.CF_ENV;
    vi.doMock("@opennextjs/cloudflare", () => {
      throw new Error("should not be imported outside Cloudflare");
    });
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    await expect(checkLoginRateLimit(headersWithIp())).resolves.toEqual({ limited: false });
  });

  it("allows when the RATE_LIMIT_KV binding is not present (namespace not yet provisioned)", async () => {
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: {}, cf: undefined, ctx: {} })),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    expect(await checkLoginRateLimit(headersWithIp())).toEqual({ limited: false });
  });

  it("allows when getCloudflareContext itself throws (defensive fallback)", async () => {
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => {
        throw new Error("no cloudflare context available");
      }),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    expect(await checkLoginRateLimit(headersWithIp())).toEqual({ limited: false });
  });

  it("allows the first MAX_ATTEMPTS_PER_WINDOW attempts, then blocks with a positive Retry-After", async () => {
    ipHashFromHeadersMock.mockReturnValue("same-ip-hash");
    const { kv } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");

    const results = [];
    for (let i = 0; i < 12; i++) {
      results.push(await checkLoginRateLimit(headersWithIp()));
    }
    const blocked = results.filter((r) => r.limited);
    const allowed = results.filter((r) => !r.limited);
    expect(allowed).toHaveLength(10);
    expect(blocked).toHaveLength(2);
    for (const b of blocked) {
      if (b.limited) expect(b.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks separate IPs independently (one IP's attempts don't count against another)", async () => {
    const { kv } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");

    ipHashFromHeadersMock.mockReturnValue("ip-a");
    for (let i = 0; i < 10; i++) await checkLoginRateLimit(headersWithIp());
    const stillAllowedForA = await checkLoginRateLimit(headersWithIp());

    ipHashFromHeadersMock.mockReturnValue("ip-b");
    const allowedForB = await checkLoginRateLimit(headersWithIp());

    expect(stillAllowedForA.limited).toBe(true);
    expect(allowedForB.limited).toBe(false);
  });

  it("stores the counter with an expirationTtl so old windows self-clean (no explicit deletion needed)", async () => {
    ipHashFromHeadersMock.mockReturnValue("ip-hash-ttl");
    const { kv, puts } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    await checkLoginRateLimit(headersWithIp());
    expect(puts).toHaveLength(1);
    expect(puts[0].options?.expirationTtl).toBeGreaterThan(0);
  });

  it("never stores anything beyond an opaque ipHash-derived key and a numeric counter (no extra PII fields)", async () => {
    ipHashFromHeadersMock.mockReturnValue("abc123hash");
    const { kv, puts } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    await checkLoginRateLimit(headersWithIp());
    expect(puts[0].key).toContain("abc123hash");
    expect(puts[0].value).toBe("1");
  });

  it("fails open (allows) if kv.get throws", async () => {
    const kv = {
      get: vi.fn(async () => {
        throw new Error("KV unavailable");
      }),
      put: vi.fn(async () => {}),
    };
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    expect(await checkLoginRateLimit(headersWithIp())).toEqual({ limited: false });
  });

  it("still allows the current request if kv.put (counter update) fails", async () => {
    const kv = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => {
        throw new Error("KV write failed");
      }),
    };
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkLoginRateLimit } = await import("../loginRateLimit");
    expect(await checkLoginRateLimit(headersWithIp())).toEqual({ limited: false });
  });
});
