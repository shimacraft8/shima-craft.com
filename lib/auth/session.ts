import "server-only";
import { cookies } from "next/headers";
import { adminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Firebase Session Cookie の作成・検証・削除。
 * - Cookie名は衝突しない専用名（環境変数で上書き可）。
 * - HttpOnly / Secure(本番) / SameSite=Lax / Path=/。
 * - 有効期間は5日（Firebaseの上限は14日だが用途上短めにする）。
 */

export const SESSION_COOKIE_NAME = process.env.FIREBASE_SESSION_COOKIE_NAME || "sc_session";
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5日
/** ID Token の auth_time がこの秒数より古い場合はログインし直しを要求する。 */
export const MAX_AUTH_AGE_SECONDS = 5 * 60;

export async function createSessionCookieFromIdToken(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });
}

/** ID Token を検証し、失効(revoked)も確認する。 */
export async function verifyIdTokenStrict(idToken: string): Promise<DecodedIdToken> {
  return adminAuth().verifyIdToken(idToken, true);
}

/** Session Cookie を検証し、失効・無効化(checkRevoked=true)も確認する。 */
export async function verifySessionCookie(cookie: string): Promise<DecodedIdToken | null> {
  try {
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

/** リクエストの Session Cookie から検証済みトークンを得る（無ければ null）。 */
export async function getVerifiedSession(): Promise<DecodedIdToken | null> {
  // Firebase未設定の環境（プロジェクト構築前のデプロイ等）では未ログイン扱いにし、
  // 既存ページを500で壊さず「ログインが必要」導線を表示する。
  if (!isAdminConfigured()) return null;
  const cookie = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifySessionCookie(cookie);
}

export function setSessionCookieOnStore(value: string): void {
  cookies().set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export function clearSessionCookieOnStore(): void {
  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
