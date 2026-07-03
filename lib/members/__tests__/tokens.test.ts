import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateInvitationToken,
  hashEmail,
  hashIp,
  hashToken,
  ipHashFromHeaders,
  logDocId,
} from "../tokens";

beforeEach(() => {
  vi.stubEnv("INVITATION_TOKEN_SECRET", "test-secret-abcdefghijklmnopqrstuvwxyz-1234567890");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("generateInvitationToken", () => {
  it("毎回異なる十分な長さのトークンを生成する", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });
});

describe("hashToken / hashEmail / hashIp", () => {
  it("同じ入力は同じハッシュ、異なる入力は異なるハッシュ", () => {
    expect(hashToken("t1")).toBe(hashToken("t1"));
    expect(hashToken("t1")).not.toBe(hashToken("t2"));
    expect(hashEmail("a@example.com")).not.toBe(hashEmail("b@example.com"));
  });

  it("生の値がハッシュに含まれない", () => {
    const h = hashIp("203.0.113.9");
    expect(h).not.toContain("203.0.113.9");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("ipHashFromHeaders", () => {
  it("x-forwarded-for の先頭IPを使う。無ければnull", () => {
    const h1 = ipHashFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }));
    const h2 = ipHashFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.9" }));
    expect(h1).toBe(h2);
    expect(ipHashFromHeaders(new Headers())).toBeNull();
  });
});

describe("logDocId（idempotency key）", () => {
  it("executionId + eventType で決定論的", () => {
    expect(logDocId("exec1", "colorize_succeeded")).toBe(logDocId("exec1", "colorize_succeeded"));
    expect(logDocId("exec1", "colorize_succeeded")).not.toBe(logDocId("exec1", "colorize_failed"));
    expect(logDocId("exec1", "colorize_succeeded")).not.toBe(logDocId("exec2", "colorize_succeeded"));
  });
});
