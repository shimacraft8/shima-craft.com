import { describe, expect, it } from "vitest";
import { canUseColorize } from "../types";

describe("canUseColorize（利用可否の判定）", () => {
  it("active + active/payment_pending は利用可能", () => {
    expect(canUseColorize({ account_status: "active", contract_status: "active" })).toBe(true);
    expect(canUseColorize({ account_status: "active", contract_status: "payment_pending" })).toBe(true);
  });

  it("unpaid / cancelled は利用不可", () => {
    expect(canUseColorize({ account_status: "active", contract_status: "unpaid" })).toBe(false);
    expect(canUseColorize({ account_status: "active", contract_status: "cancelled" })).toBe(false);
  });

  it("suspended / deleted は契約状態に関わらず利用不可", () => {
    expect(canUseColorize({ account_status: "suspended", contract_status: "active" })).toBe(false);
    expect(canUseColorize({ account_status: "deleted", contract_status: "active" })).toBe(false);
  });
});
