import { describe, expect, it } from "vitest";
import { detectBrowserName, detectDeviceType } from "../userAgent";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const EDGE_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

describe("detectBrowserName", () => {
  it("主要ブラウザを判定する", () => {
    expect(detectBrowserName(CHROME_MAC)).toBe("chrome");
    expect(detectBrowserName(SAFARI_IPHONE)).toBe("safari");
    expect(detectBrowserName(EDGE_WIN)).toBe("edge");
    expect(detectBrowserName(FIREFOX)).toBe("firefox");
    expect(detectBrowserName("")).toBe("other");
  });
});

describe("detectDeviceType", () => {
  it("デバイス種別を判定する", () => {
    expect(detectDeviceType(CHROME_MAC)).toBe("desktop");
    expect(detectDeviceType(SAFARI_IPHONE)).toBe("mobile");
    expect(detectDeviceType(ANDROID_CHROME)).toBe("mobile");
    expect(detectDeviceType("Mozilla/5.0 (iPad; CPU OS 17_5)")).toBe("tablet");
    expect(detectDeviceType("")).toBe("unknown");
  });
});
