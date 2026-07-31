import "server-only";
import { pemToDer, utf8ToBase64Url } from "./base64url";
import { assertOk, dedupeInFlight, fetchWithTimeout } from "./httpClient";

/**
 * サービスアカウントのOAuth2アクセストークン取得（JWT-bearerフロー、Web Crypto使用）。
 * firebase-admin SDKを使わずに、既存の FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * （Vercel/ローカルと共通の環境変数）から直接トークンを取得する。
 * Cloudflare Workers（Web Crypto標準API）・Node.js（ローカル/Vercel）の両方で同一コードが動く。
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EXPIRY_MARGIN_SECONDS = 300; // 残り5分を切ったら再取得

export type GoogleAuthScope =
  | "https://www.googleapis.com/auth/identitytoolkit"
  | "https://www.googleapis.com/auth/datastore";

type CachedToken = { accessToken: string; expiresAtEpochSeconds: number; scope: string };

const cache = new Map<string, CachedToken>();
const inFlight = new Map<string, Promise<string>>();

function normalizePrivateKey(raw: string): string {
  // lib/firebase/admin.ts と同じ正規化（Vercel等で \n がエスケープされる問題への対応）
  const unquoted = raw.replace(/^"([\s\S]*)"$/, "$1");
  return unquoted.includes("\\n") ? unquoted.replace(/\\n/g, "\n") : unquoted;
}

let signingKeyPromise: Promise<CryptoKey> | null = null;

function getSigningKey(): Promise<CryptoKey> {
  if (!signingKeyPromise) {
    signingKeyPromise = (async () => {
      const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
      if (!privateKeyRaw) throw new Error("FIREBASE_PRIVATE_KEY is not configured");
      const der = pemToDer(normalizePrivateKey(privateKeyRaw));
      return crypto.subtle.importKey(
        "pkcs8",
        der,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
    })();
    signingKeyPromise.catch(() => {
      signingKeyPromise = null;
    });
  }
  return signingKeyPromise;
}

async function signJwtAssertion(scopes: GoogleAuthScope[]): Promise<string> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (!clientEmail) throw new Error("FIREBASE_CLIENT_EMAIL is not configured");

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const signingInput = `${utf8ToBase64Url(JSON.stringify(header))}.${utf8ToBase64Url(JSON.stringify(payload))}`;
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  const sigBytes = new Uint8Array(signature);
  let sigBinary = "";
  for (let i = 0; i < sigBytes.length; i++) sigBinary += String.fromCharCode(sigBytes[i]);
  const sigB64Url = btoa(sigBinary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${signingInput}.${sigB64Url}`;
}

async function requestNewAccessToken(cacheKey: string, scopes: GoogleAuthScope[]): Promise<string> {
  const assertion = await signJwtAssertion(scopes);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetchWithTimeout(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  // Googleのエラーレスポンス本文はそのまま外へ漏らさない（assertOkはステータスのみを見て分類する）
  assertOk(res, "service account token request");

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cache.set(cacheKey, {
    accessToken: json.access_token,
    expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + json.expires_in,
    scope: cacheKey,
  });
  return json.access_token;
}

/**
 * 指定scopeのアクセストークンを取得する（有効期限内はキャッシュを再利用）。
 * scopeの組み合わせごとに個別にキャッシュする。
 * 期限切れ間際の同時呼び出しは1回のリクエストへ集約する（cache stampede対策）。
 */
export async function getServiceAccountAccessToken(scopes: GoogleAuthScope[]): Promise<string> {
  const cacheKey = [...scopes].sort().join(" ");
  const cached = cache.get(cacheKey);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAtEpochSeconds - EXPIRY_MARGIN_SECONDS > nowSeconds) {
    return cached.accessToken;
  }

  return dedupeInFlight(inFlight, cacheKey, () => requestNewAccessToken(cacheKey, scopes));
}

/** テスト専用: モジュールキャッシュをリセットする。 */
export function __resetGoogleAuthCacheForTests(): void {
  cache.clear();
  inFlight.clear();
  signingKeyPromise = null;
}
