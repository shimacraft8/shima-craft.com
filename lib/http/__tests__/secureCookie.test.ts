import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSecureCookieContext } from "../secureCookie";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isSecureCookieContext", () => {
  it("is false when NODE_ENV is not production (e.g. local `next dev`, test)", () => {
    Object.assign(process.env, { NODE_ENV: "development" });
    delete process.env.CF_ENV;
    expect(isSecureCookieContext()).toBe(false);
  });

  it("is false on local wrangler dev even though the build always bakes NODE_ENV=production (CF_ENV=preview)", () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.CF_ENV = "preview";
    expect(isSecureCookieContext()).toBe(false);
  });

  it("is true on real Cloudflare production (NODE_ENV=production, CF_ENV=production)", () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.CF_ENV = "production";
    expect(isSecureCookieContext()).toBe(true);
  });

  it("is true on Vercel (NODE_ENV=production, CF_ENV unset)", () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.CF_ENV;
    expect(isSecureCookieContext()).toBe(true);
  });
});
