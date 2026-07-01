import { afterEach, describe, expect, it, vi } from "vitest";
import { ReplicateColorizationProvider } from "../replicate";

const ORIGINAL_TOKEN = process.env.REPLICATE_API_TOKEN;
const ORIGINAL_VERSION = process.env.REPLICATE_DDCOLOR_VERSION;

function makeInput() {
  return { imageBuffer: Buffer.from("fake-image-bytes"), mimeType: "image/jpeg" as const };
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
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
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
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
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
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
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
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
    expect(result).toEqual({
      ok: true,
      resultUrl: "https://replicate.delivery/done.png",
      model: "piddnad/ddcolor",
      version: expect.any(String),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("predictionがfailedならMODEL_FAILEDを返す", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
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
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
    expect(result).toEqual({ ok: false, code: "MODEL_FAILED" });
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
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
    expect(result).toEqual({ ok: false, code: "MODEL_TIMEOUT" });
  }, 10_000);

  it("認証エラー(401)はSERVICE_DISABLEDとして扱う", async () => {
    process.env.REPLICATE_API_TOKEN = "invalid-token";
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
    expect(result).toEqual({ ok: false, code: "SERVICE_DISABLED" });
  });

  it("AbortErrorはMODEL_TIMEOUTとして扱う", async () => {
    process.env.REPLICATE_API_TOKEN = "test-token";
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    const provider = new ReplicateColorizationProvider(fetchMock as unknown as typeof fetch);
    const result = await provider.colorize(makeInput(), { signal: new AbortController().signal });
    expect(result).toEqual({ ok: false, code: "MODEL_TIMEOUT" });
  });
});
