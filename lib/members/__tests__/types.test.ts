import { describe, expect, it } from "vitest";
import { canUseColorize } from "../types";

describe("canUseColorize（会員制の利用可否）", () => {
  it("active + active のみ利用可能", () => {
    expect(canUseColorize({ accountStatus: "active", contractStatus: "active" })).toBe(true);
  });

  it("payment_pending は利用不可（入金確認前）", () => {
    expect(canUseColorize({ accountStatus: "active", contractStatus: "payment_pending" })).toBe(false);
  });

  it("unpaid / cancelled は利用不可", () => {
    expect(canUseColorize({ accountStatus: "active", contractStatus: "unpaid" })).toBe(false);
    expect(canUseColorize({ accountStatus: "active", contractStatus: "cancelled" })).toBe(false);
  });

  it("suspended / deleted は契約状態に関わらず利用不可", () => {
    expect(canUseColorize({ accountStatus: "suspended", contractStatus: "active" })).toBe(false);
    expect(canUseColorize({ accountStatus: "deleted", contractStatus: "active" })).toBe(false);
  });
});
