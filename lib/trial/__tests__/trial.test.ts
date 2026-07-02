import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hashIdentity,
  ipHashFromHeaders,
  issueTicket,
  trialCookieLimit,
  trialIpLimit,
  verifyTicket,
} from "../trial";

beforeEach(() => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key-for-hmac-1234567890");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hashIdentity / ipHashFromHeaders", () => {
  it("同じ入力は同じハッシュ・異なる入力は異なるハッシュ", () => {
    expect(hashIdentity("abc")).toBe(hashIdentity("abc"));
    expect(hashIdentity("abc")).not.toBe(hashIdentity("abd"));
  });

  it("生の値がハッシュに含まれない", () => {
    const h = hashIdentity("203.0.113.7");
    expect(h).not.toContain("203.0.113.7");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("x-forwarded-for の先頭IPを使う", () => {
    const h1 = ipHashFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    const h2 = ipHashFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.7" }));
    expect(h1).toBe(h2);
  });
});

describe("issueTicket / verifyTicket", () => {
  it("正しいCookieハッシュで検証に成功する", () => {
    const cid = hashIdentity("cookie-1");
    const raw = issueTicket(cid);
    const ticket = verifyTicket(raw, cid);
    expect(ticket).not.toBeNull();
    expect(ticket?.cid).toBe(cid);
    expect(ticket?.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("異なるCookie（別ブラウザ）のチケットは拒否する", () => {
    const raw = issueTicket(hashIdentity("cookie-1"));
    expect(verifyTicket(raw, hashIdentity("cookie-2"))).toBeNull();
  });

  it("署名を改ざんしたチケットは拒否する", () => {
    const cid = hashIdentity("cookie-1");
    const raw = issueTicket(cid);
    const [payload] = raw.split(".");
    expect(verifyTicket(`${payload}.forged-signature`, cid)).toBeNull();
  });

  it("ペイロードを改ざんしたチケットは拒否する", () => {
    const cid = hashIdentity("cookie-1");
    const raw = issueTicket(cid);
    const [, sig] = raw.split(".");
    const forged = Buffer.from(JSON.stringify({ jti: "x", cid, exp: Date.now() + 99999 })).toString(
      "base64url"
    );
    expect(verifyTicket(`${forged}.${sig}`, cid)).toBeNull();
  });

  it("期限切れチケットは拒否する", () => {
    vi.useFakeTimers();
    const cid = hashIdentity("cookie-1");
    const raw = issueTicket(cid);
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(verifyTicket(raw, cid)).toBeNull();
    vi.useRealTimers();
  });

  it("形式不正は拒否する", () => {
    const cid = hashIdentity("c");
    expect(verifyTicket("", cid)).toBeNull();
    expect(verifyTicket("a.b.c", cid)).toBeNull();
    expect(verifyTicket("not-a-ticket", cid)).toBeNull();
  });
});

describe("上限の環境変数", () => {
  it("既定は3回", () => {
    expect(trialCookieLimit()).toBe(3);
    expect(trialIpLimit()).toBe(3);
  });

  it("環境変数で上書きできる（不正値は既定へ）", () => {
    vi.stubEnv("TRIAL_FREE_LIMIT", "5");
    vi.stubEnv("TRIAL_IP_LIMIT", "-1");
    expect(trialCookieLimit()).toBe(5);
    expect(trialIpLimit()).toBe(3);
  });
});
