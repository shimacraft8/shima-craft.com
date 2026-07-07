import { describe, expect, it } from "vitest";
import {
  FREE_DAILY_LIMIT,
  buildDailyCookieValue,
  checkAndIncrementFreeGate,
  parseDailyCookie,
} from "../freeGate";

describe("parseDailyCookie", () => {
  it("undefined → null", () => {
    expect(parseDailyCookie(undefined)).toBeNull();
  });

  it("空文字 → null", () => {
    expect(parseDailyCookie("")).toBeNull();
  });

  it("不正なフォーマット → null", () => {
    expect(parseDailyCookie("invalid")).toBeNull();
    expect(parseDailyCookie("2025-07-07")).toBeNull();
    expect(parseDailyCookie("2025-07-07:")).toBeNull();
  });

  it("正常なフォーマットをパースする", () => {
    const result = parseDailyCookie("2025-07-07:2");
    expect(result).not.toBeNull();
    expect(result!.date).toBe("2025-07-07");
    expect(result!.count).toBe(2);
  });

  it("count=0 も有効", () => {
    const result = parseDailyCookie("2025-01-01:0");
    expect(result!.count).toBe(0);
  });
});

describe("buildDailyCookieValue", () => {
  it("日付とカウントを結合する", () => {
    expect(buildDailyCookieValue("2025-07-07", 1)).toBe("2025-07-07:1");
  });
});

describe("checkAndIncrementFreeGate", () => {
  // JST のテストは実際の「今日」に依存するため、固定日付でテストできる部分に絞る

  it("count が FREE_DAILY_LIMIT に達していたら allowed=false を返す", () => {
    // 未来の日付（テスト実行時に必ず有効な「今日」ではない日）は使えないため、
    // 今日として扱われる「正しい JST 日付」を持つ count=3 のクッキーで試す
    // → isFreeGateEnabled はここでは関与しないのでシンプルに count を MAX にする
    const today = (() => {
      const now = new Date();
      const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      return jst.toISOString().slice(0, 10);
    })();
    const cookieValue = buildDailyCookieValue(today, FREE_DAILY_LIMIT);
    const result = checkAndIncrementFreeGate(cookieValue);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.remaining).toBe(0);
    }
  });

  it("count が FREE_DAILY_LIMIT 未満なら allowed=true を返す", () => {
    const today = (() => {
      const now = new Date();
      const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      return jst.toISOString().slice(0, 10);
    })();
    const cookieValue = buildDailyCookieValue(today, 1);
    const result = checkAndIncrementFreeGate(cookieValue);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.used).toBe(2);
      expect(result.remaining).toBe(FREE_DAILY_LIMIT - 2);
    }
  });

  it("クッキーなし (undefined) → 初回扱いで allowed=true", () => {
    const result = checkAndIncrementFreeGate(undefined);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.used).toBe(1);
      expect(result.remaining).toBe(FREE_DAILY_LIMIT - 1);
    }
  });

  it("昨日の日付のクッキー → 新しい日として count=0 からスタート", () => {
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      return jst.toISOString().slice(0, 10);
    })();
    const cookieValue = buildDailyCookieValue(yesterday, FREE_DAILY_LIMIT);
    const result = checkAndIncrementFreeGate(cookieValue);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.used).toBe(1);
    }
  });
});
