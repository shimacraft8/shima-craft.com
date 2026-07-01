import { afterEach, describe, expect, it, vi } from "vitest";
import { ReplicateColorizationProvider } from "../replicate";

const ORIGINAL_TOKEN = process.env.REPLICATE_API_TOKEN;
const ORIGINAL_VERSION = process.env.REPLICATE_DDCOLOR_VERSION;

const TEST_REQUEST_ID = "test-request-id-1234";

function makeInput() {
  return { imageBuffer: Buffer.from("fake-image-bytes"), mimeType: "image/jpeg" as const };
}

function callOptions(signal: AbortSignal = new AbortController().signal) {
  return { signal, requestId: TEST_REQUEST_ID };
}

afterEach(() => {
  process.env.REPLICATE_API_TOKEN = ORIGINAL_TOKEN;
  process.env.REPLICATE_DDCOLOR_VERSION = ORIGINAL_VERSION;
  vi.restoreAllMocks();
});

describe("ReplicateColorizationProvider", () => {
  it("REPLICATE_API_TOKEN未設定ならSERVICE_DISABLEDを返す(APIキーを露出させず安全に失敗)", async () => {
    delete process.env.REPLICATE_API_TOKEN;
    const provider = new ReplicateColorizationProvider(vi.fn() as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "SERVICE_DISABLED" });
  });

  it("即時succeededを返すpredictionから結果URLを取り出す", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pred-1",
        status: "succeeded",
        output: "https://replicate.delivery/output.png",
        urls: { get: "https://api.replicate.com/v1/predictions/pred-1" },
      }),
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({
      ok: true,
      resultUrl: "https://replicate.delivery/output.png",
      model: "piddnad/ddcolor",
      version: expect.any(String),
    });
  });

  it("output が配列の場合は先頭要素を使う", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pred-2",
        status: "succeeded",
        output: ["https://replicate.delivery/first.png", "https://replicate.delivery/second.png"],
        urls: { get: "https://api.replicate.com/v1/predictions/pred-2" },
      }),
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result.ok && result.resultUrl).toBe("https://replicate.delivery/first.png");
  });

  it("processing状態からポーリングしてsucceededになれば成功する", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "pred-3",
          status: "processing",
          urls: { get: "https://api.replicate.com/v1/predictions/pred-3" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "pred-3",
          status: "succeeded",
          output: "https://replicate.delivery/done.png",
          urls: { get: "https://api.replicate.com/v1/predictions/pred-3" },
        }),
      });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({
      ok: true,
      resultUrl: "https://replicate.delivery/done.png",
      model: "piddnad/ddcolor",
      version: expect.any(String),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("predictionがfailedならMODEL_EXECUTION_FAILEDを返す", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pred-4",
        status: "failed",
        error: "internal model error",
        urls: { get: "https://api.replicate.com/v1/predictions/pred-4" },
      }),
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "MODEL_EXECUTION_FAILED" });
    const loggedText = consoleErrorSpy.mock.calls.map((call) => JSON.stringify(call)).join("\n");
    expect(loggedText).toContain(TEST_REQUEST_ID);
    consoleErrorSpy.mockRestore();
  });

  it("ポーリング予算を超えたらMODEL_TIMEOUTを返す", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pred-5",
        status: "processing",
        urls: { get: "https://api.replicate.com/v1/predictions/pred-5" },
      }),
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch, 500);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "MODEL_TIMEOUT" });
  }, 10_000);

  it("認証エラー(401/403)はREPLICATE_AUTH_FAILEDに分類する", async () => {
    process.env.REPLICATE_API_TOKEN = "invalid-token";
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}), clone() { return this; } });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "REPLICATE_AUTH_FAILED" });
  });

  it("課金未設定(402)はREPLICATE_BILLING_REQUIREDに分類する", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ detail: "You have not set up billing" }),
      clone() { return this; },
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "REPLICATE_BILLING_REQUIRED" });
  });

  it("バージョン不正(404)はMODEL_VERSION_INVALIDに分類する", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Invalid version or not permitted" }),
      clone() { return this; },
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "MODEL_VERSION_INVALID" });
  });

  it("入力スキーマ不一致(422)はMODEL_VERSION_INVALIDに分類する", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ detail: "Invalid version or not permitted", status: 422 }),
      clone() {
        return this;
      },
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "MODEL_VERSION_INVALID" });
    const loggedText = consoleErrorSpy.mock.calls.map((call) => JSON.stringify(call)).join("\n");
    expect(loggedText).toContain("Invalid version");
    expect(loggedText).toContain(TEST_REQUEST_ID);
    expect(loggedText).not.toContain("test-token");
    consoleErrorSpy.mockRestore();
  });

  it("その他の5xx等はMODEL_EXECUTION_FAILEDに分類する", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "internal server error" }),
      clone() { return this; },
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "MODEL_EXECUTION_FAILED" });
  });

  it("AbortErrorはMODEL_TIMEOUTとして扱う", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result).toEqual({ ok: false, code: "MODEL_TIMEOUT" });
  });

  it("REPLICATE_API_TOKEN / REPLICATE_DDCOLOR_VERSIONの前後の改行・空白をtrimしてから送信する(貼り付けミス対策)", async () => {
    process.env.REPLICATE_API_TOKEN = "\ntest-token\n";
    process.env.REPLICATE_DDCOLOR_VERSION = "  abc123version  ";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pred-6",
        status: "succeeded",
        output: "https://replicate.delivery/output.png",
        urls: { get: "https://api.replicate.com/v1/predictions/pred-6" },
      }),
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result.ok && result.version).toBe("abc123version");
    const [, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse(init.body).version).toBe("abc123version");
  });

  it("REPLICATE_DDCOLOR_VERSIONが空白のみの場合はデフォルトバージョンにフォールバックする", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    process.env.REPLICATE_DDCOLOR_VERSION = "   ";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "pred-7",
        status: "succeeded",
        output: "https://replicate.delivery/output.png",
        urls: { get: "https://api.replicate.com/v1/predictions/pred-7" },
      }),
    });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), callOptions());
    expect(result.ok && result.version).toBe("ca494ba129e44e45f661d6ece83c4c98a9a7c774309beca01429b58fce8aa695");
  });
});
