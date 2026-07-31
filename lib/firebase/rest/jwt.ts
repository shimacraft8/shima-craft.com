import "server-only";
import { base64UrlToBytes, base64UrlToUtf8 } from "./base64url";
import { assertOk, dedupeInFlight, fetchWithTimeout } from "./httpClient";

/** JWT全体の最大長。実際のFirebase ID Token/Session Cookieは通常1〜2KB程度のため、
 *  巨大な入力（DoS狙い等）を処理前に拒否するための十分に余裕を持った上限。 */
const MAX_TOKEN_LENGTH = 8192;
/** Firebase UID(sub)の最大長（Firebase Authenticationの仕様上128文字）。 */
const MAX_SUB_LENGTH = 128;

/**
 * FirebaseのID Token / Session Cookieに共通するJWT検証ロジック（Web Crypto使用）。
 * 単なるBase64デコードでは済ませず、必ず署名検証まで行う。
 */

export type FirebaseJwtClaims = {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  [key: string]: unknown;
};

// lib.dom.d.ts の JsonWebKey 型には kid が定義されていない（RFC 7517には存在する）ため独自に拡張する。
type FirebaseJwk = JsonWebKey & { kid: string };
type JwkSet = { keys: FirebaseJwk[] };
type CachedJwkSet = { jwkSet: JwkSet; expiresAtEpochMs: number };

const jwkSetCache = new Map<string, CachedJwkSet>();
const verifyKeyCache = new Map<string, CryptoKey>();
const jwkSetInFlight = new Map<string, Promise<JwkSet>>();

function parseCacheControlMaxAgeMs(header: string | null): number {
  const DEFAULT_MS = 5 * 60 * 1000; // ヘッダーが無い/読めない場合は5分だけキャッシュ
  if (!header) return DEFAULT_MS;
  const match = /max-age=(\d+)/.exec(header);
  if (!match) return DEFAULT_MS;
  return Number(match[1]) * 1000;
}

function isValidJwkSet(value: unknown): value is JwkSet {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { keys?: unknown }).keys) &&
    (value as { keys: unknown[] }).keys.every(
      (k) => typeof k === "object" && k !== null && typeof (k as { kid?: unknown }).kid === "string"
    )
  );
}

async function requestJwkSet(url: string): Promise<JwkSet> {
  const res = await fetchWithTimeout(url);
  assertOk(res, "JWK set fetch");
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new JwtVerificationError("BAD_JWKS_RESPONSE", "JWK set response is not valid JSON");
  }
  if (!isValidJwkSet(parsed)) {
    // 不正な形（keysが無い/kidが無い等）はfail-closed。古いキャッシュを無期限に信用しない。
    throw new JwtVerificationError("BAD_JWKS_RESPONSE", "JWK set response has an unexpected shape");
  }
  const maxAgeMs = parseCacheControlMaxAgeMs(res.headers.get("cache-control"));
  jwkSetCache.set(url, { jwkSet: parsed, expiresAtEpochMs: Date.now() + maxAgeMs });
  return parsed;
}

/**
 * JWKSを取得する。`forceRefresh`未指定時はキャッシュ優先。
 * 同時呼び出しは1回の取得へ集約する（cache stampede対策）。
 * フェッチに失敗した場合、期限切れの古いキャッシュへは決してフォールバックしない（fail-closed）。
 */
async function fetchJwkSet(url: string, forceRefresh = false): Promise<JwkSet> {
  if (!forceRefresh) {
    const cached = jwkSetCache.get(url);
    if (cached && cached.expiresAtEpochMs > Date.now()) return cached.jwkSet;
  }
  return dedupeInFlight(jwkSetInFlight, url, () => requestJwkSet(url));
}

async function importVerifyKey(jwksUrl: string, jwk: FirebaseJwk): Promise<CryptoKey> {
  const cacheKey = `${jwksUrl}#${jwk.kid}`;
  const cached = verifyKeyCache.get(cacheKey);
  if (cached) return cached;
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  verifyKeyCache.set(cacheKey, key);
  return key;
}

export class JwtVerificationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "JwtVerificationError";
    this.code = code;
  }
}

export type VerifyFirebaseJwtOptions = {
  jwksUrl: string;
  expectedIssuer: string;
  expectedAudience: string;
  /** 許容するクロックスキュー（秒）。既定30秒。 */
  clockSkewSeconds?: number;
};

/**
 * Firebase発行のJWT（ID TokenまたはSession Cookie）を検証する。
 * alg/kid/署名/exp/iat/aud/iss/sub/auth_timeを全て検証し、いずれかが不正なら例外を投げる。
 * 成功時のみクレームを返す（＝呼び出し側は「returnされた＝検証済み」を信頼してよい）。
 */
export async function verifyFirebaseJwt(
  token: string,
  options: VerifyFirebaseJwtOptions
): Promise<FirebaseJwtClaims> {
  if (typeof token !== "string" || token.length === 0) {
    throw new JwtVerificationError("MALFORMED", "token is empty");
  }
  if (token.length > MAX_TOKEN_LENGTH) {
    throw new JwtVerificationError("TOKEN_TOO_LARGE", `token exceeds ${MAX_TOKEN_LENGTH} bytes`);
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    throw new JwtVerificationError("MALFORMED", "token is not a valid JWT");
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let claims: FirebaseJwtClaims;
  try {
    header = JSON.parse(base64UrlToUtf8(headerB64));
    claims = JSON.parse(base64UrlToUtf8(payloadB64));
  } catch {
    throw new JwtVerificationError("MALFORMED", "failed to parse token header/payload");
  }

  // alg=none や HS256（対称鍵）への置換攻撃を拒否する。RS256のみ許可。
  if (header.alg !== "RS256") {
    throw new JwtVerificationError("BAD_ALG", `unexpected alg: ${header.alg}`);
  }
  if (!header.kid) {
    throw new JwtVerificationError("MISSING_KID", "token has no kid");
  }

  let jwkSet = await fetchJwkSet(options.jwksUrl);
  let jwk = jwkSet.keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    // 未知のkid: Google側の鍵ローテーション直後の可能性があるため、キャッシュを無視して一度だけ再取得する。
    jwkSet = await fetchJwkSet(options.jwksUrl, true);
    jwk = jwkSet.keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new JwtVerificationError("UNKNOWN_KID", "kid does not match any known signing key");
  }

  const key = await importVerifyKey(options.jwksUrl, jwk);
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlToBytes(signatureB64);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signatureBytes.buffer as ArrayBuffer,
    signingInput
  );
  if (!valid) {
    throw new JwtVerificationError("BAD_SIGNATURE", "signature verification failed");
  }

  const skew = options.clockSkewSeconds ?? 30;
  const nowSeconds = Date.now() / 1000;

  if (claims.aud !== options.expectedAudience) {
    throw new JwtVerificationError("BAD_AUDIENCE", "aud does not match expected project");
  }
  if (claims.iss !== options.expectedIssuer) {
    throw new JwtVerificationError("BAD_ISSUER", "iss does not match expected issuer");
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new JwtVerificationError("MISSING_SUB", "sub is empty");
  }
  if (claims.sub.length > MAX_SUB_LENGTH) {
    throw new JwtVerificationError("SUB_TOO_LONG", `sub exceeds ${MAX_SUB_LENGTH} characters`);
  }
  if (typeof claims.exp !== "number" || claims.exp + skew < nowSeconds) {
    throw new JwtVerificationError("EXPIRED", "token has expired");
  }
  if (typeof claims.iat !== "number" || claims.iat - skew > nowSeconds) {
    throw new JwtVerificationError("BAD_IAT", "iat is in the future");
  }
  if (typeof claims.auth_time !== "number" || claims.auth_time - skew > nowSeconds) {
    throw new JwtVerificationError("BAD_AUTH_TIME", "auth_time is missing or in the future");
  }

  return claims;
}

/** テスト専用: モジュールキャッシュをリセットする。 */
export function __resetJwtCachesForTests(): void {
  jwkSetCache.clear();
  verifyKeyCache.clear();
  jwkSetInFlight.clear();
}
