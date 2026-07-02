import { describe, expect, it } from "vitest";
import { POST } from "../route";

describe("POST /api/tools/photo-colorize (廃止済みエンドポイント)", () => {
  it("410 Gone と移行案内を返す", async () => {
    const res = await POST();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe("ENDPOINT_RETIRED");
    expect(body.retryable).toBe(false);
    expect(body.userMessage).toContain("再読み込み");
  });
});
