import "server-only";
import { createHash, randomBytes, randomUUID } from "crypto";

/**
 * 招待トークンとハッシュのユーティリティ。
 * - raw token はメール送信リンクにのみ載せ、Firestoreには hash だけ保存する。
 * - email/IP も監査・照合用に hash 化して保存する（生値は保存しない）。
 */

function secret(): string {
  const base =
    process.env.INVITATION_TOKEN_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_PROJECT_ID ||
    "";
  if (!base) throw new Error("invitation secret is not configured");
  return createHash("sha256").update(`shimacraft-invite:${base}`).digest("hex");
}

/** 暗号学的に安全なランダムトークン（URL安全）。 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(`${secret()}:token:${rawToken}`).digest("hex");
}

export function hashEmail(emailLower: string): string {
  return createHash("sha256").update(`${secret()}:email:${emailLower}`).digest("hex");
}

export function hashIp(ip: string): string {
  const salt = process.env.LOG_IP_HASH_SALT || secret();
  return createHash("sha256").update(`${salt}:ip:${ip}`).digest("hex");
}

export function ipHashFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : headers.get("x-real-ip"))?.trim();
  return ip ? hashIp(ip) : null;
}

export function newInvitationId(): string {
  return randomUUID();
}

export function newRequestId(): string {
  return randomUUID();
}

/**
 * 決定論的idempotency key（同じイベントの二重記録防止）。
 * executionId + eventType の組をログのドキュメントIDに使う想定。
 */
export function logDocId(executionId: string, eventType: string): string {
  return createHash("sha256").update(`${executionId}:${eventType}`).digest("hex").slice(0, 40);
}
