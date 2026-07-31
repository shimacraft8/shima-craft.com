import "server-only";
import { getServiceAccountAccessToken } from "./googleAuth";
import { assertOk, fetchWithTimeout, GoogleApiError } from "./httpClient";

/**
 * Identity Toolkit Admin REST（Google Identity Platform）の薄いラッパー。
 * firebase-admin/auth の Admin操作（Node.js SDK・gRPC相当）をCloudflare Workers互換の
 * fetch + サービスアカウントOAuth2で置き換える。
 * エラーはGoogleApiError（401/403/429/5xx/timeoutを分類済み）で統一する。
 */

const IDENTITY_TOOLKIT_SCOPE = "https://www.googleapis.com/auth/identitytoolkit" as const;

function projectBaseUrl(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured");
  return `https://identitytoolkit.googleapis.com/v1/projects/${projectId}`;
}

async function authorizedFetch(url: string, body: unknown): Promise<Response> {
  const accessToken = await getServiceAccountAccessToken([IDENTITY_TOOLKIT_SCOPE]);
  return fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

export { GoogleApiError as IdentityToolkitError };

/**
 * 検証済みID TokenからFirebase Session Cookieを発行する（公式 projects.createSessionCookie）。
 * firebase-admin の adminAuth().createSessionCookie(idToken, {expiresIn}) の代替。
 * 呼び出し前にID Tokenの検証（lib/firebase/rest/idToken.ts）を必ず済ませておくこと
 * （このAPI自体はID Tokenの正当性を再検証しない前提で使う）。
 */
export async function createSessionCookie(idToken: string, validDurationMs: number): Promise<string> {
  const validDurationSeconds = Math.floor(validDurationMs / 1000);
  if (validDurationSeconds < 5 * 60 || validDurationSeconds > 14 * 24 * 60 * 60) {
    throw new Error("validDuration must be between 5 minutes and 14 days");
  }

  const res = await authorizedFetch(`${projectBaseUrl()}:createSessionCookie`, {
    idToken,
    validDuration: String(validDurationSeconds),
  });
  // Google側のエラー本文をそのまま外部へ漏らさない（詳細はサーバーログにも出力しない：秘密情報混入回避のため要約のみ）
  assertOk(res, "createSessionCookie");

  let json: { sessionCookie?: string };
  try {
    json = (await res.json()) as { sessionCookie?: string };
  } catch {
    throw new GoogleApiError(res.status, "unknown", "createSessionCookie response is not valid JSON");
  }
  // 異常レスポンス（本文はあるがsessionCookieが無い等）で空Cookieを発行しない。
  if (!json.sessionCookie) {
    throw new GoogleApiError(res.status, "unknown", "createSessionCookie response missing sessionCookie");
  }
  return json.sessionCookie;
}

export type LookupUserResult = {
  localId: string;
  disabled: boolean;
  /** トークン失効基準時刻（Unix秒）。この時刻より前に発行されたトークン/Cookieは無効として扱う。 */
  validSinceSeconds: number;
  customAttributes: Record<string, unknown> | null;
};

/**
 * uidでユーザー情報を引く（projects.accounts.lookup）。
 * disabled状態・validSince（失効基準時刻）・custom claimsの確認に使う。
 * firebase-admin の adminAuth().getUser(uid) 相当（必要フィールドのみ）。
 */
export async function lookupUser(uid: string): Promise<LookupUserResult | null> {
  const res = await authorizedFetch(`${projectBaseUrl()}/accounts:lookup`, { localId: [uid] });
  assertOk(res, "accounts:lookup");

  let json: {
    users?: Array<{
      localId: string;
      disabled?: boolean;
      validSince?: string;
      customAttributes?: string;
    }>;
  };
  try {
    json = await res.json();
  } catch {
    throw new GoogleApiError(res.status, "unknown", "accounts:lookup response is not valid JSON");
  }
  const user = json.users?.[0];
  if (!user) return null;

  return {
    localId: user.localId,
    disabled: user.disabled === true,
    validSinceSeconds: user.validSince ? Number(user.validSince) : 0,
    customAttributes: user.customAttributes ? (JSON.parse(user.customAttributes) as Record<string, unknown>) : null,
  };
}

/**
 * uidの全リフレッシュトークン・Session Cookie・ID Tokenを失効させる（全端末ログアウト）。
 * firebase-admin の adminAuth().revokeRefreshTokens(uid) の代替（projects.accounts:update
 * の validSince を現在時刻に更新することで、それより前に発行された全トークンを無効化する）。
 */
export async function revokeAllRefreshTokens(uid: string): Promise<void> {
  const res = await authorizedFetch(`${projectBaseUrl()}/accounts:update`, {
    localId: uid,
    validSince: String(Math.floor(Date.now() / 1000)),
  });
  assertOk(res, "accounts:update (revokeAllRefreshTokens)");
}

/**
 * uidのcustom claimsを設定する。firebase-admin の
 * adminAuth().setCustomUserClaims(uid, claims) の代替。
 * role等の認可の正はFirestore側（member.role/accountStatus）であり、
 * このclaimは補助的な同期用途（呼び出し元でのfail-closed設計は変えない）。
 */
export async function setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
  const res = await authorizedFetch(`${projectBaseUrl()}/accounts:update`, {
    localId: uid,
    customAttributes: JSON.stringify(claims),
  });
  assertOk(res, "accounts:update (setCustomUserClaims)");
}

/**
 * uidを無効化/再有効化する。firebase-admin の
 * adminAuth().updateUser(uid, {disabled}) の代替。
 */
export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  const res = await authorizedFetch(`${projectBaseUrl()}/accounts:update`, {
    localId: uid,
    disableUser: disabled,
  });
  assertOk(res, "accounts:update (setUserDisabled)");
}
