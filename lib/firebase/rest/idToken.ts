import "server-only";
import { verifyFirebaseJwt, type FirebaseJwtClaims } from "./jwt";

/**
 * Firebase ID Tokenの検証（Web Crypto + Googleの公開鍵、REST版）。
 * firebase-admin の adminAuth().verifyIdToken(idToken, true) の代替。
 * 「失効(revoked)確認」は別途 lib/firebase/rest/authAdmin.ts の accounts:lookup で行う
 * （このモジュール単体では取消チェックまではできない＝JWT検証の範囲を超えるため）。
 */

const ID_TOKEN_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export type DecodedIdToken = FirebaseJwtClaims & { uid: string };

export async function verifyIdToken(idToken: string): Promise<DecodedIdToken> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured");

  const claims = await verifyFirebaseJwt(idToken, {
    jwksUrl: ID_TOKEN_JWKS_URL,
    expectedAudience: projectId,
    expectedIssuer: `https://securetoken.google.com/${projectId}`,
  });

  return { ...claims, uid: claims.sub };
}
