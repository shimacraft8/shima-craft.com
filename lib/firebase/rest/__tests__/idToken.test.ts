import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportPublicJwk, generateTestRsaKeyPair, jwkSetResponse, signTestJwt } from "./testJwtHelpers";

const ORIGINAL_ENV = { ...process.env };
const KID = "id-token-kid";

describe("verifyIdToken", () => {
  let keyPair: CryptoKeyPair;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: "test-project" };
    keyPair = await generateTestRsaKeyPair();
    const jwk = await exportPublicJwk(keyPair.publicKey, KID);
    vi.stubGlobal("fetch", vi.fn(async () => jwkSetResponse([jwk])));
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("verifies a valid Firebase ID token and exposes uid", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signTestJwt(keyPair.privateKey, KID, {
      sub: "user-abc",
      aud: "test-project",
      iss: "https://securetoken.google.com/test-project",
      iat: now - 5,
      exp: now + 3600,
      auth_time: now - 5,
      email: "user@example.com",
      email_verified: true,
    });
    const { verifyIdToken } = await import("../idToken");
    const decoded = await verifyIdToken(token);
    expect(decoded.uid).toBe("user-abc");
    expect(decoded.email).toBe("user@example.com");
  });

  it("rejects a token issued for a different Firebase project", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signTestJwt(keyPair.privateKey, KID, {
      sub: "user-abc",
      aud: "other-project",
      iss: "https://securetoken.google.com/other-project",
      iat: now - 5,
      exp: now + 3600,
      auth_time: now - 5,
    });
    const { verifyIdToken } = await import("../idToken");
    await expect(verifyIdToken(token)).rejects.toThrow();
  });

  it("throws when FIREBASE_PROJECT_ID is not configured", async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    const { verifyIdToken } = await import("../idToken");
    await expect(verifyIdToken("whatever")).rejects.toThrow("FIREBASE_PROJECT_ID");
  });

  it("rejects a Session Cookie (session.firebase.google.com issuer) presented as an ID token", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signTestJwt(keyPair.privateKey, KID, {
      sub: "user-abc",
      aud: "test-project",
      iss: "https://session.firebase.google.com/test-project",
      iat: now - 5,
      exp: now + 3600,
      auth_time: now - 5,
    });
    const { verifyIdToken } = await import("../idToken");
    await expect(verifyIdToken(token)).rejects.toThrow(/iss/i);
  });
});
