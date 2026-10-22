import "server-only";
import { createHash } from "node:crypto";

export class RequestError extends Error {
  constructor(public readonly status: number, public readonly code: string) { super(code); }
}

/** Count bytes while reading, including chunked bodies, before JSON parsing. */
export async function readJSON(request: Request, limit = 32_768, timeoutMs = 5000): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.toLowerCase().split(";")[0].trim() !== "application/json") throw new RequestError(415, "INVALID_CONTENT_TYPE");
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > limit) throw new RequestError(413, "BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "INVALID_JSON");
  const chunks: Uint8Array[] = []; let bytes = 0;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RequestError(408, "BODY_TIMEOUT"));
      void reader.cancel().catch(() => {});
    }, timeoutMs);
  });
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), deadline]); if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new RequestError(413, "BODY_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { clearTimeout(timer!); reader.releaseLock(); }
  const joined = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error();
    return parsed as Record<string, unknown>;
  } catch { throw new RequestError(400, "INVALID_JSON"); }
}

// Supplementary per-process limits. Production also needs a shared edge limiter.
const buckets = new Map<string, { count: number; until: number }>();
export function allowRequest(scope: string, principal: string, limit: number, windowMs = 60_000, now = Date.now()): boolean {
  for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key);
  const key = createHash("sha256").update(scope + ":" + principal).digest("hex");
  const entry = buckets.get(key);
  if (!entry) {
    if (buckets.size >= 2048) return false;
    buckets.set(key, { count: 1, until: now + windowMs }); return true;
  }
  if (entry.count >= limit) return false;
  entry.count++; return true;
}

export function clientAddress(request: Request): string {
  // Only enable after the deployment proxy is verified to overwrite this header.
  return process.env.TRUST_CLOUDFLARE_IP === "true"
    ? request.headers.get("cf-connecting-ip") || "unknown" : "shared";
}

type Submission = { digest: string; state: "pending" | "done" | "unknown"; until: number };
const submissions = new Map<string, Submission>();
export function beginSubmission(scope: string, token: unknown, payload: unknown, now = Date.now()): "new" | "done" {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) throw new RequestError(400, "INVALID_SUBMISSION_TOKEN");
  for (const [key, entry] of submissions) if (entry.until <= now) submissions.delete(key);
  const key = scope + ":" + token, digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const old = submissions.get(key);
  if (old) {
    if (old.digest !== digest) throw new RequestError(409, "SUBMISSION_CHANGED");
    if (old.state === "done") return "done";
    throw new RequestError(409, old.state === "unknown" ? "DELIVERY_UNCERTAIN" : "SUBMISSION_PENDING");
  }
  if (submissions.size >= 2048) throw new RequestError(503, "BUSY");
  submissions.set(key, { digest, state: "pending", until: now + 10 * 60_000 }); return "new";
}
export function finishSubmission(scope: string, token: string, state: "done" | "failed" | "unknown"): void {
  const key = scope + ":" + token, entry = submissions.get(key);
  if (state === "failed") submissions.delete(key);
  else if (entry) entry.state = state;
}

export async function verifyChallenge(request: Request, token: unknown, action: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const host = new URL(request.url).hostname;
  if (!secret) throw new RequestError(503, "FORM_PROTECTION_NOT_CONFIGURED");
  if (typeof token !== "string" || !token || token.length > 2048) throw new RequestError(400, "CHALLENGE_REQUIRED");
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(5000),
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, response: token }),
    });
    if (!response.ok) throw new RequestError(503, "CHALLENGE_UNAVAILABLE");
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    if (result.success !== true || result.hostname !== host || result.action !== action) throw new RequestError(400, "CHALLENGE_FAILED");
  } catch (e) { if (e instanceof RequestError) throw e; throw new RequestError(503, "CHALLENGE_UNAVAILABLE"); }
}

export function safeError(error: unknown): Response {
  const known = error instanceof RequestError;
  return Response.json({ ok: false, success: false, code: known ? error.code : "REQUEST_FAILED", error: known && error.code === "DELIVERY_UNCERTAIN" ? "送信結果を確認できません。重複を避けるため再送せず、メールで受付状況をお問い合わせください。" : "送信できませんでした。入力と接続を確認し、時間をおいて再度お試しください。" }, {
    status: known ? error.status : 503, headers: { "Cache-Control": "no-store", ...(known && error.status === 429 ? { "Retry-After": "60" } : {}) },
  });
}
