import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportPublicJwk, generateTestRsaKeyPair, jwkSetResponse, signTestJwt } from "./testJwtHelpers";

const ORIGINAL_ENV = { ...process.env };
const KID = "session-cookie-kid";

const lookupUserMock = vi.fn();
vi.mock("../authAdmin", () => ({
  lookupUser: (...args: unknown[]) => lookupUserMock(...args),
}));

async function makeSessionCookie(keyPair: CryptoKeyPair, overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return signTestJwt(keyPair.privateKey, KID, {
    sub: "user-xyz",
    aud: "test-project",
    iss: "https://session.firebase.google.com/test-project",
    iat: now - 10,
    exp: now + 3600,
    auth_time: now - 10,
    ...overrides,
  });
}

describe("verifySessionCookie", () => {
  let keyPair: CryptoKeyPair;

  beforeEach(async () => {
    vi.resetModules();
    lookupUserMock.mockReset();
    process.env = { ...ORIGINAL_ENV, FIREBASE_PROJECT_ID: "test-project" };
    keyPair = await generateTestRsaKeyPair();
    const jwk = await exportPublicJwk(keyPair.publicKey, KID);
    vi.stubGlobal("fetch", vi.fn(async () => jwkSetResponse([jwk])));
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("accepts a valid, non-revoked, non-disabled session cookie", async () => {
    lookupUserMock.mockResolvedValue({ localId: "user-xyz", disabled: false, validSinceSeconds: 0, customAttributes: null });
    const cookie = await makeSessionCookie(keyPair);
    const { verifySessionCookie } = await import("../sessionCookie");
    const decoded = await verifySessionCookie(cookie);
    expect(decoded?.uid).toBe("user-xyz");
  });

  it("returns null when the user account is disabled", async () => {
    lookupUserMock.mockResolvedValue({ localId: "user-xyz", disabled: true, validSinceSeconds: 0, customAttributes: null });
    const cookie = await makeSessionCookie(keyPair);
    const { verifySessionCookie } = await import("../sessionCookie");
    expect(await verifySessionCookie(cookie)).toBeNull();
  });

  it("returns null when the cookie was issued before validSince (revoked)", async () => {
    const now = Math.floor(Date.now() / 1000);
    lookupUserMock.mockResolvedValue({
      localId: "user-xyz",
      disabled: false,
      validSinceSeconds: now + 1000, // revocation happened after this cookie's iat
      customAttributes: null,
    });
    const cookie = await makeSessionCookie(keyPair, { iat: now - 10 });
    const { verifySessionCookie } = await import("../sessionCookie");
    expect(await verifySessionCookie(cookie)).toBeNull();
  });

  it("returns null when the user no longer exists", async () => {
    lookupUserMock.mockResolvedValue(null);
    const cookie = await makeSessionCookie(keyPair);
    const { verifySessionCookie } = await import("../sessionCookie");
    expect(await verifySessionCookie(cookie)).toBeNull();
  });

  it("fails closed (returns null) when the revocation lookup itself errors", async () => {
    lookupUserMock.mockRejectedValue(new Error("network error"));
    const cookie = await makeSessionCookie(keyPair);
    const { verifySessionCookie } = await import("../sessionCookie");
    expect(await verifySessionCookie(cookie)).toBeNull();
  });

  it("rejects a token with the ID-token issuer presented as a session cookie", async () => {
    lookupUserMock.mockResolvedValue({ localId: "user-xyz", disabled: false, validSinceSeconds: 0, customAttributes: null });
    const cookie = await makeSessionCookie(keyPair, { iss: "https://securetoken.google.com/test-project" });
    const { verifySessionCookie } = await import("../sessionCookie");
    expect(await verifySessionCookie(cookie)).toBeNull();
  });

  it("rejects a tampered cookie", async () => {
    lookupUserMock.mockResolvedValue({ localId: "user-xyz", disabled: false, validSinceSeconds: 0, customAttributes: null });
    const cookie = await makeSessionCookie(keyPair);
    const [h, p, s] = cookie.split(".");
    const tamperedPayload = btoa(JSON.stringify({ ...JSON.parse(atob(p)), sub: "attacker" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const { verifySessionCookie } = await import("../sessionCookie");
    expect(await verifySessionCookie(`${h}.${tamperedPayload}.${s}`)).toBeNull();
  });
});
