import "server-only";
import { verifyFirebaseJwt, type FirebaseJwtClaims } from "./jwt";
import { lookupUser } from "./authAdmin";

/**
 * Firebase Session Cookieの検証（Web Crypto + Googleの公開鍵、REST版）。
 * firebase-admin の adminAuth().verifySessionCookie(cookie, true) の代替
 * （第2引数 checkRevoked=true 相当の失効チェックを常に行う。既存の挙動を弱めない）。
 *
 * ID Tokenとは発行者(iss)も検証鍵セットも異なるため、専用のJWKSエンドポイントを使う。
 */

const SESSION_COOKIE_JWKS_URL = "https://identitytoolkit.googleapis.com/v1/sessionCookiePublicKeys";

export type DecodedSessionCookie = FirebaseJwtClaims & { uid: string };

export class SessionCookieRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionCookieRevokedError";
  }
}

/**
 * Session Cookieを検証する。失効(disabled/validSinceより古い)の場合は null を返す
 * （lib/auth/session.ts の既存の verifySessionCookie の「無効ならnull」という契約を維持するため）。
 */
export async function verifySessionCookie(cookie: string): Promise<DecodedSessionCookie | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured");

  let claims: FirebaseJwtClaims;
  try {
    claims = await verifyFirebaseJwt(cookie, {
      jwksUrl: SESSION_COOKIE_JWKS_URL,
      expectedAudience: projectId,
      expectedIssuer: `https://session.firebase.google.com/${projectId}`,
    });
  } catch {
    return null;
  }

  const uid = claims.sub;

  // 失効チェック（checkRevoked相当）: disabled、またはvalidSinceより前に発行されたCookieは無効。
  try {
    const user = await lookupUser(uid);
    if (!user || user.disabled) return null;
    if (typeof claims.iat === "number" && claims.iat < user.validSinceSeconds) return null;
  } catch {
    // lookupUser自体が失敗した場合は安全側（未ログイン扱い）に倒す。
    return null;
  }

  return { ...claims, uid };
}
