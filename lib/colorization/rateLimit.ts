import { createHash } from "crypto";

/**
 * IP単位・全体単位の日次レート制限。
 *
 * 既知の制限: Vercel Serverless/Edge は複数インスタンスに分散するため、
 * このインメモリ実装はインスタンス単位でしかカウントを共有できない。
 * 厳密な分散レート制限ではなく、費用暴走に対する補助的な歯止めとして扱うこと。
 * 将来的にアクセスが増えた場合は Vercel KV / Upstash 等の永続ストアへ置き換える。
 */

type Bucket = { count: number; resetAt: number };

type RateLimitResult = { ok: true } | { ok: false; reason: "ip" | "global" };

export type RateLimiterOptions = {
  dailyLimit?: number;
  globalDailyLimit?: number | null;
  salt?: string;
  now?: () => number;
};

function nextUtcMidnight(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const perIp = new Map<string, Bucket>();
  let globalBucket: Bucket = { count: 0, resetAt: 0 };

  function resolveDailyLimit(): number {
    const raw = options.dailyLimit ?? Number(process.env.COLORIZE_DAILY_LIMIT ?? 5);
    return Number.isFinite(raw) && raw > 0 ? raw : 5;
  }

  function resolveGlobalLimit(): number | null {
    if (options.globalDailyLimit !== undefined) return options.globalDailyLimit;
    const raw = process.env.COLORIZE_GLOBAL_DAILY_LIMIT;
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function hashIp(ip: string): string {
    const salt = options.salt ?? process.env.COLORIZE_RATE_LIMIT_SALT ?? "shima-craft-colorize";
    return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  }

  function cleanupExpired(now: number): void {
    if (perIp.size < 5000) return;
    Array.from(perIp.entries()).forEach(([key, bucket]) => {
      if (now > bucket.resetAt) perIp.delete(key);
    });
  }

  function check(ip: string): RateLimitResult {
    const now = options.now ? options.now() : Date.now();
    const dailyLimit = resolveDailyLimit();
    const globalLimit = resolveGlobalLimit();

    if (now > globalBucket.resetAt) {
      globalBucket = { count: 0, resetAt: nextUtcMidnight(now) };
    }
    if (globalLimit !== null && globalBucket.count >= globalLimit) {
      return { ok: false, reason: "global" };
    }

    cleanupExpired(now);
    const key = hashIp(ip);
    const entry = perIp.get(key);
    if (!entry || now > entry.resetAt) {
      perIp.set(key, { count: 0, resetAt: nextUtcMidnight(now) });
    }
    const bucket = perIp.get(key)!;
    if (bucket.count >= dailyLimit) {
      return { ok: false, reason: "ip" };
    }

    bucket.count++;
    globalBucket.count++;
    return { ok: true };
  }

  return { check, hashIp };
}

export const colorizeRateLimiter = createRateLimiter();
