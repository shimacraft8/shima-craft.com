import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../rateLimit";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("createRateLimiter", () => {
  it("IPごとの上限内であれば許可する", () => {
    const limiter = createRateLimiter({ dailyLimit: 3, globalDailyLimit: null, now: () => 0 });
    expect(limiter.check("1.2.3.4")).toEqual({ ok: true });
    expect(limiter.check("1.2.3.4")).toEqual({ ok: true });
    expect(limiter.check("1.2.3.4")).toEqual({ ok: true });
  });

  it("IPごとの上限を超えるとRATE_LIMITEDになる", () => {
    const limiter = createRateLimiter({ dailyLimit: 2, globalDailyLimit: null, now: () => 0 });
    expect(limiter.check("1.2.3.4").ok).toBe(true);
    expect(limiter.check("1.2.3.4").ok).toBe(true);
    const result = limiter.check("1.2.3.4");
    expect(result).toEqual({ ok: false, reason: "ip" });
  });

  it("別IPは独立してカウントされる", () => {
    const limiter = createRateLimiter({ dailyLimit: 1, globalDailyLimit: null, now: () => 0 });
    expect(limiter.check("1.1.1.1").ok).toBe(true);
    expect(limiter.check("2.2.2.2").ok).toBe(true);
    expect(limiter.check("1.1.1.1").ok).toBe(false);
  });

  it("日付が変わるとカウントがリセットされる", () => {
    let now = 0;
    const limiter = createRateLimiter({ dailyLimit: 1, globalDailyLimit: null, now: () => now });
    expect(limiter.check("1.1.1.1").ok).toBe(true);
    expect(limiter.check("1.1.1.1").ok).toBe(false);
    now += DAY_MS + 1;
    expect(limiter.check("1.1.1.1").ok).toBe(true);
  });

  it("全体上限に達すると個別IPの残数があってもRATE_LIMITEDになる", () => {
    const limiter = createRateLimiter({ dailyLimit: 10, globalDailyLimit: 2, now: () => 0 });
    expect(limiter.check("1.1.1.1").ok).toBe(true);
    expect(limiter.check("2.2.2.2").ok).toBe(true);
    const result = limiter.check("3.3.3.3");
    expect(result).toEqual({ ok: false, reason: "global" });
  });

  it("hashIpは生IPをそのまま返さない", () => {
    const limiter = createRateLimiter({ salt: "test-salt" });
    const hashed = limiter.hashIp("203.0.113.5");
    expect(hashed).not.toBe("203.0.113.5");
    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
  });
});
