import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64UrlToBytes, base64UrlToUtf8 } from "../base64url";

const ORIGINAL_ENV = { ...process.env };

async function generateTestKeyPairPem(): Promise<{ privateKeyPem: string; publicKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const bytes = new Uint8Array(pkcs8);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  const lines = b64.match(/.{1,64}/g) ?? [];
  const pem = `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
  return { privateKeyPem: pem, publicKey: keyPair.publicKey };
}

describe("googleAuth", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("signs a JWT assertion that verifies against the matching public key", async () => {
    const { privateKeyPem, publicKey } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;

    let capturedAssertion = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const params = new URLSearchParams(init.body as string);
        capturedAssertion = params.get("assertion") ?? "";
        return new Response(JSON.stringify({ access_token: "test-token", expires_in: 3600 }), { status: 200 });
      })
    );

    const { getServiceAccountAccessToken } = await import("../googleAuth");
    const token = await getServiceAccountAccessToken(["https://www.googleapis.com/auth/identitytoolkit"]);
    expect(token).toBe("test-token");

    const [headerB64, payloadB64, sigB64] = capturedAssertion.split(".");
    const header = JSON.parse(base64UrlToUtf8(headerB64));
    const payload = JSON.parse(base64UrlToUtf8(payloadB64));
    expect(header.alg).toBe("RS256");
    expect(payload.iss).toBe("sa@example.iam.gserviceaccount.com");
    expect(payload.scope).toBe("https://www.googleapis.com/auth/identitytoolkit");
    expect(payload.aud).toBe("https://oauth2.googleapis.com/token");

    const signingInput = `${headerB64}.${payloadB64}`;
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      base64UrlToBytes(sigB64).buffer as ArrayBuffer,
      new TextEncoder().encode(signingInput)
    );
    expect(valid).toBe(true);
  });

  it("caches the access token and does not refetch within the expiry margin", async () => {
    const { privateKeyPem } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "cached-token", expires_in: 3600 }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getServiceAccountAccessToken } = await import("../googleAuth");
    const a = await getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    const b = await getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    expect(a).toBe("cached-token");
    expect(b).toBe("cached-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches once the cached token is within the expiry margin", async () => {
    const { privateKeyPem } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;

    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        // 1回目は残り4分（マージン5分を下回る）で即再取得が必要になるようにする
        const expiresIn = call === 1 ? 240 : 3600;
        return new Response(JSON.stringify({ access_token: `token-${call}`, expires_in: expiresIn }), { status: 200 });
      })
    );

    const { getServiceAccountAccessToken } = await import("../googleAuth");
    const a = await getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    const b = await getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    expect(a).toBe("token-1");
    expect(b).toBe("token-2");
  });

  it("throws when FIREBASE_CLIENT_EMAIL is missing", async () => {
    delete process.env.FIREBASE_CLIENT_EMAIL;
    process.env.FIREBASE_PRIVATE_KEY = "dummy";
    const { getServiceAccountAccessToken } = await import("../googleAuth");
    await expect(
      getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"])
    ).rejects.toThrow("FIREBASE_CLIENT_EMAIL");
  });

  it("throws when FIREBASE_PRIVATE_KEY is missing", async () => {
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    delete process.env.FIREBASE_PRIVATE_KEY;
    const { getServiceAccountAccessToken } = await import("../googleAuth");
    await expect(
      getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"])
    ).rejects.toThrow("FIREBASE_PRIVATE_KEY");
  });

  it("surfaces a non-leaky error when the token endpoint rejects the request", async () => {
    const { privateKeyPem } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("invalid_grant", { status: 400 })));

    const { getServiceAccountAccessToken } = await import("../googleAuth");
    await expect(
      getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"])
    ).rejects.toThrow("HTTP 400");
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [429, "rate_limited"],
    [500, "server_error"],
    [503, "server_error"],
  ])("classifies HTTP %i as kind=%s", async (status, expectedKind) => {
    const { privateKeyPem } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("error body not to be leaked", { status })));

    const { getServiceAccountAccessToken } = await import("../googleAuth");
    const { GoogleApiError } = await import("../httpClient");
    try {
      await getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
      expect.unreachable("expected getServiceAccountAccessToken to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(GoogleApiError);
      expect((e as InstanceType<typeof GoogleApiError>).kind).toBe(expectedKind);
      expect((e as Error).message).not.toContain("error body not to be leaked");
    }
  });

  it("fails closed with a timeout error when the token endpoint hangs", async () => {
    const { privateKeyPem } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new DOMException("aborted", "TimeoutError");
        throw err;
      })
    );

    const { getServiceAccountAccessToken } = await import("../googleAuth");
    await expect(
      getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"])
    ).rejects.toThrow(/timed out/i);
  });

  it("issues exactly one token request when the cache is cold and multiple callers race concurrently", async () => {
    const { privateKeyPem } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;

    const deferred: { resolve: (() => void) | null } = { resolve: null };
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          deferred.resolve = () =>
            resolve(new Response(JSON.stringify({ access_token: "shared-token", expires_in: 3600 }), { status: 200 }));
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getServiceAccountAccessToken } = await import("../googleAuth");
    const p1 = getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    const p2 = getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    // signJwtAssertion内のWeb Crypto署名（実際の非同期処理）が完了するまで待つ。
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    deferred.resolve?.();
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe("shared-token");
    expect(b).toBe("shared-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("issues exactly one refresh when concurrent callers race right as the cached token crosses the expiry margin", async () => {
    const { privateKeyPem } = await generateTestKeyPairPem();
    process.env.FIREBASE_CLIENT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.FIREBASE_PRIVATE_KEY = privateKeyPem;

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: "first-token", expires_in: 240 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { getServiceAccountAccessToken } = await import("../googleAuth");
    await getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 240秒はマージン(300秒)を下回るため、キャッシュは即座に「更新が必要」と判定される。
    const deferred: { resolve: (() => void) | null } = { resolve: null };
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          deferred.resolve = () =>
            resolve(new Response(JSON.stringify({ access_token: "second-token", expires_in: 3600 }), { status: 200 }));
        })
    );
    const p1 = getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    const p2 = getServiceAccountAccessToken(["https://www.googleapis.com/auth/datastore"]);
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1回目の呼び出し分 + 今回の1回のみ
    deferred.resolve?.();
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe("second-token");
    expect(b).toBe("second-token");
  });
});
