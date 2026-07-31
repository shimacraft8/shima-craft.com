import "server-only";
import { cookies } from "next/headers";
import { isAdminConfigured } from "@/lib/firebase/isConfigured";
import { createSessionCookie as createSessionCookieRest, lookupUser } from "@/lib/firebase/rest/authAdmin";
import { verifyIdToken as verifyIdTokenRest, type DecodedIdToken as RestDecodedIdToken } from "@/lib/firebase/rest/idToken";
import { verifySessionCookie as verifySessionCookieRest } from "@/lib/firebase/rest/sessionCookie";

/**
 * Firebase Session Cookie の作成・検証・削除。
 * - Cookie名は衝突しない専用名（環境変数で上書き可）。
 * - HttpOnly / Secure(本番) / SameSite=Lax / Path=/。
 * - 有効期間は5日（Firebaseの上限は14日だが用途上短めにする）。
 *
 * Cloudflare Workers対応のため、firebase-admin（gRPC/protobufjs、Workersでは動作しない）
 * ではなく lib/firebase/rest/* のREST実装を使う（Stage 1-4）。Cookie名・有効期間・属性・
 * 「失効チェックを常に行う」という既存の挙動は変更していない。
 */

export const SESSION_COOKIE_NAME = process.env.FIREBASE_SESSION_COOKIE_NAME || "sc_session";
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5日
/** ID Token の auth_time がこの秒数より古い場合はログインし直しを要求する。 */
export const MAX_AUTH_AGE_SECONDS = 5 * 60;

export type DecodedIdToken = RestDecodedIdToken;

export async function createSessionCookieFromIdToken(idToken: string): Promise<string> {
  return createSessionCookieRest(idToken, SESSION_DURATION_MS);
}

export class StaleAuthTimeError extends Error {
  constructor() {
    super("auth_time is older than MAX_AUTH_AGE_SECONDS");
    this.name = "StaleAuthTimeError";
  }
}

/**
 * ID Token を検証し、失効(revoked)・auth_timeの鮮度（5分以内）も確認する。
 * 元のadminAuth().verifyIdToken(idToken, true)相当（失効チェック）に、
 * 新規ログイン受付時に必要なauth_time鮮度チェックを追加している
 * （呼び出し元がlib/members/login.tsのresolveLoginのみだったため、そちらの重複チェックより
 *  先にここで拒否できるよう、セッション発行の入口であるこの関数に集約した）。
 */
export async function verifyIdTokenStrict(idToken: string): Promise<DecodedIdToken> {
  const decoded = await verifyIdTokenRest(idToken);

  const user = await lookupUser(decoded.uid);
  if (!user || user.disabled) {
    throw new Error("user not found or disabled");
  }
  if (decoded.iat < user.validSinceSeconds) {
    throw new Error("token was issued before the most recent revocation");
  }

  const authTime = typeof decoded.auth_time === "number" ? decoded.auth_time : 0;
  if (Date.now() / 1000 - authTime > MAX_AUTH_AGE_SECONDS) {
    throw new StaleAuthTimeError();
  }

  return decoded;
}

/** Session Cookie を検証し、失効・無効化も確認する（不正/失効時はnull）。 */
export async function verifySessionCookie(cookie: string): Promise<DecodedIdToken | null> {
  return verifySessionCookieRest(cookie);
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

/**
 * Secure属性の判定。`next build`（Vercelデプロイ・Cloudflareデプロイ・wrangler devの
 * いずれも含む）はビルド時に常に NODE_ENV=production を焼き込むため、
 * NODE_ENV単独ではローカルwrangler dev（http、Secureだと届かない）と実際の
 * Cloudflare本番配信を区別できない。CF_ENV（wrangler.jsonc、GA4対応時に導入済み）を
 * 併用し、ローカルwrangler dev（CF_ENV="preview"）の時だけ安全にfalseへ倒す。
 * Vercel上ではCF_ENVは未設定のため、既存の挙動（NODE_ENV===productionでtrue）は変わらない。
 */
function isSecureCookieContext(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.CF_ENV === "preview") return false;
  return true;
}

export function setSessionCookieOnStore(value: string): void {
  cookies().set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: isSecureCookieContext(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export function clearSessionCookieOnStore(): void {
  cookies().set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureCookieContext(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
