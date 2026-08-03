import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const ipHashFromHeadersMock = vi.fn();

vi.mock("@/lib/http/ipHash", () => ({
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

describe("checkColorizeIpLimit", () => {
  it("always allows when ipHashFromHeaders returns null (IP not determinable)", async () => {
    ipHashFromHeadersMock.mockReturnValue(null);
    const { checkColorizeIpLimit } = await import("../colorizeIpLimit");
    expect(await checkColorizeIpLimit(headersWithIp())).toEqual({ limited: false });
  });

  it("fails open (allows) when ipHashFromHeaders itself throws (e.g. LOG_IP_HASH_SALT not configured) — must never break the free colorize feature", async () => {
    ipHashFromHeadersMock.mockImplementation(() => {
      throw new Error("LOG_IP_HASH_SALT is not configured");
    });
    const { checkColorizeIpLimit } = await import("../colorizeIpLimit");
    await expect(checkColorizeIpLimit(headersWithIp())).resolves.toEqual({ limited: false });
  });

  it("always allows on non-Cloudflare platforms (CF_ENV unset, e.g. Vercel)", async () => {
    delete process.env.CF_ENV;
    vi.doMock("@opennextjs/cloudflare", () => {
      throw new Error("should not be imported outside Cloudflare");
    });
    const { checkColorizeIpLimit } = await import("../colorizeIpLimit");
    await expect(checkColorizeIpLimit(headersWithIp())).resolves.toEqual({ limited: false });
  });

  it("allows when the RATE_LIMIT_KV binding is not present", async () => {
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: {}, cf: undefined, ctx: {} })),
    }));
    const { checkColorizeIpLimit } = await import("../colorizeIpLimit");
    expect(await checkColorizeIpLimit(headersWithIp())).toEqual({ limited: false });
  });

  it("allows when getCloudflareContext itself throws (defensive fallback)", async () => {
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => {
        throw new Error("no cloudflare context available");
      }),
    }));
    const { checkColorizeIpLimit } = await import("../colorizeIpLimit");
    expect(await checkColorizeIpLimit(headersWithIp())).toEqual({ limited: false });
  });

  it("allows while the stored count is below FREE_DAILY_LIMIT, then blocks with a positive Retry-After", async () => {
    const { kv } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkColorizeIpLimit, incrementColorizeIpCount } = await import("../colorizeIpLimit");
    const { FREE_DAILY_LIMIT } = await import("@/lib/colorization/freeGate");

    for (let i = 0; i < FREE_DAILY_LIMIT; i++) {
      // eslint-disable-next-line no-await-in-loop
      expect(await checkColorizeIpLimit(headersWithIp())).toEqual({ limited: false });
      // eslint-disable-next-line no-await-in-loop
      await incrementColorizeIpCount(headersWithIp());
    }
    const result = await checkColorizeIpLimit(headersWithIp());
    expect(result.limited).toBe(true);
    if (result.limited) expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate IPs independently (one IP's usage doesn't count against another)", async () => {
    const { kv } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { checkColorizeIpLimit, incrementColorizeIpCount } = await import("../colorizeIpLimit");
    const { FREE_DAILY_LIMIT } = await import("@/lib/colorization/freeGate");

    ipHashFromHeadersMock.mockReturnValue("ip-a");
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) {
      // eslint-disable-next-line no-await-in-loop
      await incrementColorizeIpCount(headersWithIp());
    }
    const stillAllowedForA = await checkColorizeIpLimit(headersWithIp());

    ipHashFromHeadersMock.mockReturnValue("ip-b");
    const allowedForB = await checkColorizeIpLimit(headersWithIp());

    expect(stillAllowedForA.limited).toBe(true);
    expect(allowedForB.limited).toBe(false);
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
    const { checkColorizeIpLimit } = await import("../colorizeIpLimit");
    expect(await checkColorizeIpLimit(headersWithIp())).toEqual({ limited: false });
  });
});

describe("incrementColorizeIpCount", () => {
  it("stores the counter with an expirationTtl so old windows self-clean (no explicit deletion needed)", async () => {
    ipHashFromHeadersMock.mockReturnValue("ip-hash-ttl");
    const { kv, puts } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { incrementColorizeIpCount } = await import("../colorizeIpLimit");
    await incrementColorizeIpCount(headersWithIp());
    expect(puts).toHaveLength(1);
    expect(puts[0].options?.expirationTtl).toBeGreaterThan(0);
  });

  it("never stores anything beyond an opaque ipHash-derived key and a numeric counter (no raw IP, no other PII)", async () => {
    ipHashFromHeadersMock.mockReturnValue("abc123hash");
    const { kv, puts } = fakeKv();
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { incrementColorizeIpCount } = await import("../colorizeIpLimit");
    await incrementColorizeIpCount(headersWithIp());
    expect(puts[0].key).toContain("abc123hash");
    expect(puts[0].key).not.toContain("203.0.113.42");
    expect(puts[0].value).toBe("1");
  });

  it("does nothing (no throw) when ipHashFromHeaders throws or the KV binding is unavailable", async () => {
    ipHashFromHeadersMock.mockImplementation(() => {
      throw new Error("LOG_IP_HASH_SALT is not configured");
    });
    const { incrementColorizeIpCount } = await import("../colorizeIpLimit");
    await expect(incrementColorizeIpCount(headersWithIp())).resolves.toBeUndefined();
  });

  it("does not throw if kv.put fails", async () => {
    const kv = {
      get: vi.fn(async () => null),
      put: vi.fn(async () => {
        throw new Error("KV write failed");
      }),
    };
    vi.doMock("@opennextjs/cloudflare", () => ({
      getCloudflareContext: vi.fn(async () => ({ env: { RATE_LIMIT_KV: kv }, cf: undefined, ctx: {} })),
    }));
    const { incrementColorizeIpCount } = await import("../colorizeIpLimit");
    await expect(incrementColorizeIpCount(headersWithIp())).resolves.toBeUndefined();
  });
});
