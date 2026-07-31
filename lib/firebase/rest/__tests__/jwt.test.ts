import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportPublicJwk, generateTestRsaKeyPair, jwkSetResponse, signTestJwt } from "./testJwtHelpers";

const JWKS_URL = "https://example.invalid/jwks";
const ISSUER = "https://securetoken.google.com/test-project";
const AUDIENCE = "test-project";

async function baseClaims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: "user-123",
    aud: AUDIENCE,
    iss: ISSUER,
    iat: now - 10,
    exp: now + 3600,
    auth_time: now - 10,
    ...overrides,
  };
}

describe("verifyFirebaseJwt", () => {
  let keyPair: CryptoKeyPair;
  const KID = "test-kid-1";

  beforeEach(async () => {
    vi.resetModules();
    keyPair = await generateTestRsaKeyPair();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function mockJwks(kid = KID, pair = keyPair) {
    const jwk = await exportPublicJwk(pair.publicKey, kid);
    vi.stubGlobal("fetch", vi.fn(async () => jwkSetResponse([jwk])));
  }

  it("accepts a validly signed token with correct claims", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    const claims = await verifyFirebaseJwt(token, {
      jwksUrl: JWKS_URL,
      expectedAudience: AUDIENCE,
      expectedIssuer: ISSUER,
    });
    expect(claims.sub).toBe("user-123");
  });

  it("rejects a token whose payload was tampered with after signing", async () => {
    await mockJwks();
    const { verifyFirebaseJwt, JwtVerificationError } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    const [h, p, s] = token.split(".");
    // sub を書き換えて別ユーザーになりすまそうとするケース
    const tamperedPayload = btoa(JSON.stringify({ ...JSON.parse(atob(p)), sub: "attacker" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const tampered = `${h}.${tamperedPayload}.${s}`;
    await expect(
      verifyFirebaseJwt(tampered, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(JwtVerificationError);
  });

  it("rejects a token signed by an unrelated key (wrong signer)", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const otherPair = await generateTestRsaKeyPair();
    // JWKSにはkeyPairの公開鍵のみ登録されているが、otherPairの秘密鍵で署名したトークンを検証させる
    const token = await signTestJwt(otherPair.privateKey, KID, await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/signature/i);
  });

  it("rejects a token with an unknown kid", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, "different-kid", await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/kid/i);
  });

  it("rejects a token with alg != RS256", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    const [, p, s] = token.split(".");
    const noneHeader = btoa(JSON.stringify({ alg: "none", kid: KID, typ: "JWT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await expect(
      verifyFirebaseJwt(`${noneHeader}.${p}.${s}`, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/alg/i);
  });

  it("rejects an expired token", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const now = Math.floor(Date.now() / 1000);
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims({ exp: now - 3600 }));
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/expired/i);
  });

  it("rejects a token with iat in the future", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const now = Math.floor(Date.now() / 1000);
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims({ iat: now + 3600 }));
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/iat/i);
  });

  it("rejects a token with auth_time in the future", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const now = Math.floor(Date.now() / 1000);
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims({ auth_time: now + 3600 }));
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/auth_time/i);
  });

  it("rejects a token with the wrong audience", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims({ aud: "some-other-project" }));
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/aud/i);
  });

  it("rejects a token with the wrong issuer", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(
      keyPair.privateKey,
      KID,
      await baseClaims({ iss: "https://session.firebase.google.com/test-project" })
    );
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/issuer/i);
  });

  it("rejects a token with an empty sub", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims({ sub: "" }));
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/sub/i);
  });

  it("rejects a malformed token (wrong number of segments)", async () => {
    const { verifyFirebaseJwt } = await import("../jwt");
    await expect(
      verifyFirebaseJwt("not-a-jwt", { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/valid JWT/i);
  });

  it("does not refetch the JWK set on a second call within the cache TTL", async () => {
    const jwk = await exportPublicJwk(keyPair.publicKey, KID);
    const fetchMock = vi.fn(async () => jwkSetResponse([jwk]));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    await verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER });
    await verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty token", async () => {
    const { verifyFirebaseJwt } = await import("../jwt");
    await expect(
      verifyFirebaseJwt("", { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/empty/i);
  });

  it("rejects a token exceeding the maximum allowed length", async () => {
    const { verifyFirebaseJwt } = await import("../jwt");
    const huge = "a.".repeat(5000) + "a";
    await expect(
      verifyFirebaseJwt(huge, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/exceeds/i);
  });

  it("rejects a token with an empty signature segment", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    const [h, p] = token.split(".");
    await expect(
      verifyFirebaseJwt(`${h}.${p}.`, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/valid JWT/i);
  });

  it("rejects a sub longer than the Firebase UID maximum (128 chars)", async () => {
    await mockJwks();
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims({ sub: "u".repeat(129) }));
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/exceeds/i);
  });

  it("fetches the JWK set exactly once when the cache is cold and multiple verifications race concurrently", async () => {
    const jwk = await exportPublicJwk(keyPair.publicKey, KID);
    const deferred: { resolve: (() => void) | null } = { resolve: null };
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          deferred.resolve = () => resolve(jwkSetResponse([jwk]));
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());

    const p1 = verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER });
    const p2 = verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER });
    await Promise.resolve(); // let both calls reach the fetch stage
    expect(fetchMock).toHaveBeenCalledTimes(1);
    deferred.resolve?.();
    await Promise.all([p1, p2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries the JWK fetch exactly once when the kid is unknown, then rejects if still unknown", async () => {
    const jwk = await exportPublicJwk(keyPair.publicKey, KID);
    const fetchMock = vi.fn(async () => jwkSetResponse([jwk]));
    vi.stubGlobal("fetch", fetchMock);
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, "some-other-kid", await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/kid/i);
    // 1回目（キャッシュ経由）+ 1回だけの強制再取得 = 合計2回
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recovers when the kid is unknown due to a stale cache but present after a forced refetch", async () => {
    const otherKeyPair = await generateTestRsaKeyPair();
    const staleJwk = await exportPublicJwk(otherKeyPair.publicKey, "old-kid");
    const freshJwk = await exportPublicJwk(keyPair.publicKey, KID);
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        callCount += 1;
        return jwkSetResponse(callCount === 1 ? [staleJwk] : [freshJwk, staleJwk]);
      })
    );
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    const claims = await verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER });
    expect(claims.sub).toBe("user-123");
    expect(callCount).toBe(2);
  });

  it("fails closed on JWKS fetch timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new DOMException("aborted", "TimeoutError");
        throw err;
      })
    );
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/timed out/i);
  });

  it("fails closed on JWKS fetch 429", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 429 })));
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/HTTP 429/);
  });

  it("fails closed on JWKS fetch 500", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("server error", { status: 500 })));
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/HTTP 500/);
  });

  it("fails closed on a malformed JWKS response (missing keys array)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ notKeys: [] }), { status: 200 })));
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/unexpected shape/i);
  });

  it("fails closed on a JWKS response that is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>not json</html>", { status: 200 })));
    const { verifyFirebaseJwt } = await import("../jwt");
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    await expect(
      verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/not valid JSON/i);
  });

  it("does not fall back to a stale cached JWK set forever when refetch keeps failing", async () => {
    const jwk = await exportPublicJwk(keyPair.publicKey, KID);
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        if (call === 1) return jwkSetResponse([jwk]);
        return new Response("still broken", { status: 500 });
      })
    );
    const { verifyFirebaseJwt } = await import("../jwt");
    // 1回目: 正常に取得・キャッシュ。既知kidで検証成功する。
    const token = await signTestJwt(keyPair.privateKey, KID, await baseClaims());
    await verifyFirebaseJwt(token, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER });

    // 未知kidのトークンを検証しようとすると、強制再取得が発生し、それが500で失敗する。
    // このとき「既知kidのキャッシュ」に処理をフォールバックせず、明確に失敗すること。
    const unknownKidToken = await signTestJwt(keyPair.privateKey, "brand-new-kid", await baseClaims());
    await expect(
      verifyFirebaseJwt(unknownKidToken, { jwksUrl: JWKS_URL, expectedAudience: AUDIENCE, expectedIssuer: ISSUER })
    ).rejects.toThrow(/HTTP 500/);
  });
});
