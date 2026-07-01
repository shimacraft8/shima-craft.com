// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { COLORIZE_ERROR_RETRYABLE, type ColorizeErrorCode } from "@/lib/colorization/types";

const verifyTurnstileTokenMock = vi.fn();
const rateLimiterCheckMock = vi.fn();
const colorizeMock = vi.fn();

vi.mock("@/lib/colorization/turnstile", () => ({
  verifyTurnstileToken: (...args: unknown[]) => verifyTurnstileTokenMock(...args),
}));
vi.mock("@/lib/colorization/rateLimit", () => ({
  colorizeRateLimiter: { check: (...args: unknown[]) => rateLimiterCheckMock(...args) },
}));
vi.mock("@/lib/colorization/provider", () => ({
  getColorizationProvider: () => ({ colorize: (...args: unknown[]) => colorizeMock(...args) }),
}));

// 8x8 の最小JPEG（validateImage.test.ts と同一サンプル）
const JPEG_8X8_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIAAgBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AKAA/9k=";

function jpegFile(sizeOverrideBytes?: number): File {
  const bytes = Buffer.from(JPEG_8X8_BASE64, "base64");
  const blob = new Blob([bytes], { type: "image/jpeg" });
  if (sizeOverrideBytes !== undefined) {
    Object.defineProperty(blob, "size", { value: sizeOverrideBytes });
  }
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

function buildRequest(form: FormData, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://shima-craft.com/api/tools/photo-colorize", {
    method: "POST",
    body: form,
    headers: { host: "shima-craft.com", ...headers },
  });
}

function baseForm(overrides: Partial<{ consent: string; turnstileToken: string; image: File | null }> = {}) {
  const form = new FormData();
  form.set("consent", overrides.consent ?? "true");
  form.set("turnstileToken", overrides.turnstileToken ?? "valid-token");
  const image = overrides.image === undefined ? jpegFile() : overrides.image;
  if (image) form.set("image", image);
  return form;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  verifyTurnstileTokenMock.mockReset().mockResolvedValue({ ok: true });
  rateLimiterCheckMock.mockReset().mockReturnValue({ ok: true });
  colorizeMock.mockReset().mockResolvedValue({
    ok: true,
    resultUrl: "https://replicate.delivery/result.png",
    model: "piddnad/ddcolor",
    version: "abc123",
  });
  delete process.env.COLORIZE_ENABLED;
  delete process.env.COLORIZE_MAX_BYTES;
});

afterEach(() => {
  process.env = originalEnv;
  vi.clearAllMocks();
});

describe("POST /api/tools/photo-colorize", () => {
  it("正常系: 有効な画像・同意・turnstileで成功しresultUrl・requestIdを返す", async () => {
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.resultUrl).toBe("https://replicate.delivery/result.png");
    expect(json.model).toBe("piddnad/ddcolor");
    expect(json.warnings).toEqual(["low_resolution"]); // 8x8はMIN_IMAGE_DIMENSION未満
    expect(json.requestId).toMatch(UUID_RE);
  });

  it("MIME偽装: 拡張子はjpgだが中身が画像でないファイルはUNSUPPORTED_TYPEになる", async () => {
    const fakeBlob = new Blob([Buffer.from("<script>evil()</script>")], { type: "image/jpeg" });
    const fakeFile = new File([fakeBlob], "photo.jpg", { type: "image/jpeg" });
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm({ image: fakeFile })));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.errorCode).toBe("UNSUPPORTED_TYPE");
  });

  it("過大ファイル: COLORIZE_MAX_BYTESを超えるとFILE_TOO_LARGEになる", async () => {
    process.env.COLORIZE_MAX_BYTES = "100";
    const oversized = jpegFile(200);
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm({ image: oversized })));
    const json = await res.json();
    expect(res.status).toBe(413);
    expect(json.errorCode).toBe("FILE_TOO_LARGE");
  });

  it("同意なし: consentが'true'以外だとCONSENT_REQUIREDになる", async () => {
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm({ consent: "false" })));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.errorCode).toBe("CONSENT_REQUIRED");
  });

  it("Turnstile失敗: siteverifyが失敗するとTURNSTILE_FAILEDになる", async () => {
    verifyTurnstileTokenMock.mockResolvedValue({ ok: false, reason: "invalid_token" });
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.errorCode).toBe("TURNSTILE_FAILED");
  });

  it("Turnstile未設定: not_configuredはSERVICE_DISABLEDになる(無防備実行の禁止)", async () => {
    verifyTurnstileTokenMock.mockResolvedValue({ ok: false, reason: "not_configured" });
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.errorCode).toBe("SERVICE_DISABLED");
  });

  it("レート制限: 上限に達しているとRATE_LIMITEDになる", async () => {
    rateLimiterCheckMock.mockReturnValue({ ok: false, reason: "ip" });
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.errorCode).toBe("RATE_LIMITED");
  });

  it("Replicateタイムアウト: providerがMODEL_TIMEOUTを返すと504になる", async () => {
    colorizeMock.mockResolvedValue({ ok: false, code: "MODEL_TIMEOUT" });
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();
    expect(res.status).toBe(504);
    expect(json.errorCode).toBe("MODEL_TIMEOUT");
  });

  it("COLORIZE_ENABLED=falseの場合は即座にSERVICE_DISABLEDになる", async () => {
    process.env.COLORIZE_ENABLED = "false";
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.errorCode).toBe("SERVICE_DISABLED");
    expect(colorizeMock).not.toHaveBeenCalled();
  });

  it("画像フィールドが無い場合はINVALID_FILEになる", async () => {
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm({ image: null })));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.errorCode).toBe("INVALID_FILE");
  });

  it("クロスオリジンのリクエストは拒否する", async () => {
    const { POST } = await import("../route");
    const req = buildRequest(baseForm(), { origin: "https://evil.example.com" });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.errorCode).toBe("INVALID_FILE");
    expect(colorizeMock).not.toHaveBeenCalled();
  });

  it("ハンドラ内で予期しない例外が投げられても素の502クラッシュではなくINTERNAL_ERROR(500)を安全に返す", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    rateLimiterCheckMock.mockImplementation(() => {
      throw new Error("unexpected boom");
    });
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.errorCode).toBe("INTERNAL_ERROR");
    const loggedText = consoleErrorSpy.mock.calls.map((call) => JSON.stringify(call)).join("\n");
    expect(loggedText).toContain("unexpected boom");
    consoleErrorSpy.mockRestore();
  });

  const replicateFailureCodes: Array<{ code: ColorizeErrorCode; httpStatus: number }> = [
    { code: "REPLICATE_AUTH_FAILED", httpStatus: 502 },
    { code: "REPLICATE_BILLING_REQUIRED", httpStatus: 502 },
    { code: "MODEL_VERSION_INVALID", httpStatus: 502 },
    { code: "MODEL_EXECUTION_FAILED", httpStatus: 502 },
  ];

  for (const { code, httpStatus } of replicateFailureCodes) {
    it(`Replicate分類エラー: providerが${code}を返すとHTTP ${httpStatus}で errorCode/userMessage/retryable/requestId を返す`, async () => {
      colorizeMock.mockResolvedValue({ ok: false, code });
      const { POST } = await import("../route");
      const res = await POST(buildRequest(baseForm()));
      const json = await res.json();
      expect(res.status).toBe(httpStatus);
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe(code);
      expect(typeof json.userMessage).toBe("string");
      expect(json.userMessage.length).toBeGreaterThan(0);
      expect(json.retryable).toBe(COLORIZE_ERROR_RETRYABLE[code]);
      expect(json.requestId).toMatch(UUID_RE);
      // 秘密情報・外部APIレスポンス全文・スタックトレースを含まない
      expect(JSON.stringify(json)).not.toMatch(/token|secret|stack|Error:/i);
    });
  }

  it("provider.colorizeとverifyTurnstileTokenへレスポンスと同じrequestIdが渡る(ログ追跡用)", async () => {
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm()));
    const json = await res.json();

    const [, colorizeOptions] = colorizeMock.mock.calls[0] as [unknown, { requestId: string }];
    expect(colorizeOptions.requestId).toBe(json.requestId);

    const turnstileArgs = verifyTurnstileTokenMock.mock.calls[0] as unknown[];
    expect(turnstileArgs[3]).toBe(json.requestId);
  });

  it("失敗レスポンスは常にerrorCode/userMessage/retryable/requestIdの4項目を含む", async () => {
    const { POST } = await import("../route");
    const res = await POST(buildRequest(baseForm({ consent: "false" })));
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json).toHaveProperty("errorCode");
    expect(json).toHaveProperty("userMessage");
    expect(json).toHaveProperty("retryable");
    expect(json).toHaveProperty("requestId");
    expect(json.requestId).toMatch(UUID_RE);
  });
});
