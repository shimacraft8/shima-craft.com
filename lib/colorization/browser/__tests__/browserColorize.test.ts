import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorizeError } from "@/lib/colorization/types";
import { MODEL_INPUT_SIZE } from "../ortRuntime";
import {
  classifyError,
  colorizeInBrowser,
  isBrowserSupported,
  newClientSessionId,
  type ColorizeInput,
} from "../browserColorize";

const SMALL = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  selectBackend: vi.fn(() => "wasm" as "wasm" | "webgpu"),
}));

vi.mock("../ortRuntime", async (importOriginal) => {
  const original = await importOriginal<typeof import("../ortRuntime")>();
  return {
    ...original,
    createSession: mocks.createSession,
    selectBackend: mocks.selectBackend,
  };
});

function makeReadySession(abValue = 0, backend: "wasm" | "webgpu" = "wasm") {
  return {
    session: {
      run: vi.fn(async () => ({
        output_ab: { data: new Float32Array(2 * SMALL).fill(abValue) },
      })),
      release: vi.fn(async () => {}),
    },
    ort: {
      env: { wasm: { wasmPaths: "", numThreads: 1 } },
      InferenceSession: { create: vi.fn() },
      Tensor: class {
        constructor(
          public type: string,
          public data: Float32Array,
          public dims: number[]
        ) {}
      },
    },
    backend,
    modelDownloadMs: 5,
    initMs: 7,
  };
}

function grayInput(width: number, height: number, value = 128): ColorizeInput {
  const fullRgba = new Uint8ClampedArray(width * height * 4);
  const smallRgba = new Uint8ClampedArray(SMALL * 4);
  for (let i = 0; i < width * height; i++) {
    fullRgba.set([value, value, value, 255], i * 4);
  }
  for (let i = 0; i < SMALL; i++) {
    smallRgba.set([value, value, value, 255], i * 4);
  }
  return { fullRgba, width, height, smallRgba };
}

beforeEach(() => {
  mocks.createSession.mockReset();
  mocks.selectBackend.mockReset();
  mocks.selectBackend.mockReturnValue("wasm");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("colorizeInBrowser", () => {
  it("出力の幅・高さ・画素数が入力画像と完全一致する", async () => {
    mocks.createSession.mockResolvedValue(makeReadySession(0));
    const input = grayInput(7, 5);
    const out = await colorizeInBrowser(input, { signal: new AbortController().signal });
    expect(out.width).toBe(7);
    expect(out.height).toBe(5);
    expect(out.rgba.length).toBe(7 * 5 * 4);
  });

  it("ab=0（無彩色）の推定なら入力の輝度をそのまま保持する", async () => {
    mocks.createSession.mockResolvedValue(makeReadySession(0));
    const input = grayInput(4, 4, 180);
    const out = await colorizeInBrowser(input, { signal: new AbortController().signal });
    for (let i = 0; i < 16; i++) {
      expect(Math.abs(out.rgba[i * 4] - 180)).toBeLessThanOrEqual(1);
    }
    expect(out.grayStructureMAD).toBeLessThan(0.5);
    expect(out.warnings).toEqual([]);
  });

  it("処理中に画像データを外部へ送信しない（fetchが呼ばれない）", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    mocks.createSession.mockResolvedValue(makeReadySession(10));
    await colorizeInBrowser(grayInput(3, 3), { signal: new AbortController().signal });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("開始前にキャンセル済みなら PROCESS_CANCELLED", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      colorizeInBrowser(grayInput(2, 2), { signal: controller.signal })
    ).rejects.toMatchObject({ errorCode: "PROCESS_CANCELLED" });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("入力サイズ不一致は INTERNAL_ERROR", async () => {
    const input = grayInput(4, 4);
    await expect(
      colorizeInBrowser({ ...input, width: 5 }, { signal: new AbortController().signal })
    ).rejects.toMatchObject({ errorCode: "INTERNAL_ERROR" });
  });

  it("webgpu のセッション作成失敗時は wasm へフォールバックする", async () => {
    mocks.selectBackend.mockReturnValue("webgpu");
    mocks.createSession
      .mockRejectedValueOnce(new Error("webgpu init failed"))
      .mockResolvedValueOnce(makeReadySession(0, "wasm"));
    const out = await colorizeInBrowser(grayInput(2, 2), { signal: new AbortController().signal });
    expect(out.backend).toBe("wasm");
    expect(mocks.createSession).toHaveBeenNthCalledWith(1, "webgpu", expect.anything(), expect.anything());
    expect(mocks.createSession).toHaveBeenNthCalledWith(2, "wasm", expect.anything(), expect.anything());
  });

  it("wasm セッションのネットワーク失敗は MODEL_DOWNLOAD_FAILED", async () => {
    mocks.createSession.mockRejectedValue(new Error("model fetch failed: HTTP 404"));
    await expect(
      colorizeInBrowser(grayInput(2, 2), { signal: new AbortController().signal })
    ).rejects.toMatchObject({ errorCode: "MODEL_DOWNLOAD_FAILED" });
  });

  it("推論失敗は COLORIZATION_FAILED", async () => {
    const ready = makeReadySession(0);
    ready.session.run = vi.fn(async () => {
      throw new Error("op error");
    });
    mocks.createSession.mockResolvedValue(ready);
    await expect(
      colorizeInBrowser(grayInput(2, 2), { signal: new AbortController().signal })
    ).rejects.toMatchObject({ errorCode: "COLORIZATION_FAILED" });
  });

  it("clientSessionId が結果とエラーの両方に引き継がれる", async () => {
    mocks.createSession.mockResolvedValue(makeReadySession(0));
    const out = await colorizeInBrowser(grayInput(2, 2), {
      signal: new AbortController().signal,
      clientSessionId: "test-session-1",
    });
    expect(out.clientSessionId).toBe("test-session-1");
  });
});

describe("classifyError", () => {
  const sid = "sid";
  it("AbortError は PROCESS_CANCELLED", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(classifyError(err, "inference", sid).errorCode).toBe("PROCESS_CANCELLED");
  });
  it("RangeError / メモリ系メッセージは OUT_OF_MEMORY", () => {
    expect(classifyError(new RangeError("Array buffer allocation failed"), "inference", sid).errorCode).toBe("OUT_OF_MEMORY");
    expect(classifyError(new Error("Out of memory"), "session", sid).errorCode).toBe("OUT_OF_MEMORY");
  });
  it("session段階のネットワーク系は MODEL_DOWNLOAD_FAILED、それ以外は MODEL_INITIALIZATION_FAILED", () => {
    expect(classifyError(new TypeError("Failed to fetch"), "session", sid).errorCode).toBe("MODEL_DOWNLOAD_FAILED");
    expect(classifyError(new Error("bad model"), "session", sid).errorCode).toBe("MODEL_INITIALIZATION_FAILED");
  });
  it("ColorizeError はそのまま返す", () => {
    const original = new ColorizeError("PROCESS_CANCELLED", sid);
    expect(classifyError(original, "composite", sid)).toBe(original);
  });
});

describe("isBrowserSupported / newClientSessionId", () => {
  it("WebAssembly が無ければ非対応", () => {
    expect(isBrowserSupported({})).toBe(false);
    expect(isBrowserSupported({ WebAssembly: WebAssembly })).toBe(true);
  });
  it("clientSessionId は毎回異なる", () => {
    expect(newClientSessionId()).not.toBe(newClientSessionId());
  });
});
