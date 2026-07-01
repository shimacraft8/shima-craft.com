import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "../turnstile";

const ORIGINAL_SECRET = process.env.TURNSTILE_SECRET_KEY;

afterEach(() => {
  process.env.TURNSTILE_SECRET_KEY = ORIGINAL_SECRET;
  vi.restoreAllMocks();
});

describe("verifyTurnstileToken", () => {
  it("TURNSTILE_SECRET_KEY未設定なら常に失敗する(無防備な実行を許可しない)", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const result = await verifyTurnstileToken("some-token", "1.2.3.4", fetchMock);
    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("トークンが空文字なら siteverify を呼ばずに失敗する", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const result = await verifyTurnstileToken("", "1.2.3.4", fetchMock);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("siteverifyがsuccess:trueを返せば成功する", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
    const result = await verifyTurnstileToken("valid-token", "1.2.3.4", fetchMock);
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("siteverifyがsuccess:falseを返せば失敗する", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    }) as unknown as typeof fetch;
    const result = await verifyTurnstileToken("bad-token", "1.2.3.4", fetchMock);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("ネットワークエラー時は安全側に失敗する", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const result = await verifyTurnstileToken("token", "1.2.3.4", fetchMock);
    expect(result).toEqual({ ok: false, reason: "network_error" });
  });

  it("TURNSTILE_SECRET_KEYの前後に改行・空白があってもtrimして送信する(貼り付けミス対策)", async () => {
    process.env.TURNSTILE_SECRET_KEY = "\ntest-secret\n  ";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    const result = await verifyTurnstileToken("valid-token", "1.2.3.4", fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    expect(init.body.get("secret")).toBe("test-secret");
  });

  it("TURNSTILE_SECRET_KEYが空白のみの場合はnot_configuredとして扱う", async () => {
    process.env.TURNSTILE_SECRET_KEY = "   \n  ";
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const result = await verifyTurnstileToken("some-token", "1.2.3.4", fetchMock);
    expect(result).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
