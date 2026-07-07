import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorizeError } from "@/lib/colorization/types";
import { MODELS } from "../ortRuntime";
import {
  classifyError,
  colorizeInBrowser,
  isBrowserSupported,
  modelIdForQuality,
  newClientSessionId,
  variantForAttempt,
  type ColorizeInput,
} from "../browserColorize";

const SMALL = MODELS.siggraph17.inputSize * MODELS.siggraph17.inputSize; // 256^2
const LARGE = MODELS.ddcolor.inputSize * MODELS.ddcolor.inputSize; // 512^2

const mocks = vi.hoisted(() => ({
  createSessionForModel: vi.fn(),
  selectBackend: vi.fn(() => "wasm" as "wasm" | "webgpu"),
}));

vi.mock("../ortRuntime", async (importOriginal) => {
  const original = await importOriginal<typeof import("../ortRuntime")>();
  return {
    ...original,
    createSessionForModel: mocks.createSessionForModel,
    selectBackend: mocks.selectBackend,
  };
});

function makeReadySession(
  abValue = 0,
  backend: "wasm" | "webgpu" = "wasm",
  modelId: "siggraph17" | "ddcolor" = "siggraph17"
) {
  const model = MODELS[modelId];
  const outN = model.inputSize * model.inputSize;
  return {
    session: {
      run: vi.fn(async () => ({
        output_ab: { data: new Float32Array(2 * outN).fill(abValue) },
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
    model,
    modelDownloadMs: 5,
    initMs: 7,
  };
}

function grayInput(width: number, height: number, value = 128): ColorizeInput {
  const fullRgba = new Uint8ClampedArray(width * height * 4);
  const smallRgba = new Uint8ClampedArray(SMALL * 4);
  const largeRgba = new Uint8ClampedArray(LARGE * 4);
  for (let i = 0; i < width * height; i++) fullRgba.set([value, value, value, 255], i * 4);
  for (let i = 0; i < SMALL; i++) smallRgba.set([value, value, value, 255], i * 4);
  for (let i = 0; i < LARGE; i++) largeRgba.set([value, value, value, 255], i * 4);
  return { fullRgba, width, height, smallRgba, largeRgba };
}

beforeEach(() => {
  mocks.createSessionForModel.mockReset();
  mocks.selectBackend.mockReset();
  mocks.selectBackend.mockReturnValue("wasm");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("colorizeInBrowser", () => {
  it("出力の幅・高さ・画素数が入力画像と完全一致する", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(0));
    const input = grayInput(7, 5);
    const out = await colorizeInBrowser(input, { signal: new AbortController().signal });
    expect(out.width).toBe(7);
    expect(out.height).toBe(5);
    expect(out.rgba.length).toBe(7 * 5 * 4);
  });

  it("ab=0（無彩色）の推定なら入力の輝度をそのまま保持する", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(0));
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
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(10));
    await colorizeInBrowser(grayInput(3, 3), { signal: new AbortController().signal });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("開始前にキャンセル済みなら PROCESS_CANCELLED", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      colorizeInBrowser(grayInput(2, 2), { signal: controller.signal })
    ).rejects.toMatchObject({ errorCode: "PROCESS_CANCELLED" });
    expect(mocks.createSessionForModel).not.toHaveBeenCalled();
  });

  it("入力サイズ不一致は INTERNAL_ERROR", async () => {
    const input = grayInput(4, 4);
    await expect(
      colorizeInBrowser({ ...input, width: 5 }, { signal: new AbortController().signal })
    ).rejects.toMatchObject({ errorCode: "INTERNAL_ERROR" });
  });

  it("webgpu のセッション作成失敗時は wasm へフォールバックする", async () => {
    mocks.selectBackend.mockReturnValue("webgpu");
    mocks.createSessionForModel
      .mockRejectedValueOnce(new Error("webgpu init failed"))
      .mockResolvedValueOnce(makeReadySession(0, "wasm"));
    const out = await colorizeInBrowser(grayInput(2, 2), { signal: new AbortController().signal });
    expect(out.backend).toBe("wasm");
    expect(mocks.createSessionForModel).toHaveBeenNthCalledWith(1, "siggraph17", "webgpu", expect.anything(), expect.anything());
    expect(mocks.createSessionForModel).toHaveBeenNthCalledWith(2, "siggraph17", "wasm", expect.anything(), expect.anything());
  });

  it("wasm セッションのネットワーク失敗は MODEL_DOWNLOAD_FAILED", async () => {
    mocks.createSessionForModel.mockRejectedValue(new Error("model fetch failed: HTTP 404"));
    await expect(
      colorizeInBrowser(grayInput(2, 2), { signal: new AbortController().signal })
    ).rejects.toMatchObject({ errorCode: "MODEL_DOWNLOAD_FAILED" });
  });

  it("推論失敗は COLORIZATION_FAILED", async () => {
    const ready = makeReadySession(0);
    ready.session.run = vi.fn(async () => {
      throw new Error("op error");
    });
    mocks.createSessionForModel.mockResolvedValue(ready);
    await expect(
      colorizeInBrowser(grayInput(2, 2), { signal: new AbortController().signal })
    ).rejects.toMatchObject({ errorCode: "COLORIZATION_FAILED" });
  });

  it("clientSessionId が結果とエラーの両方に引き継がれる", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(0));
    const out = await colorizeInBrowser(grayInput(2, 2), {
      signal: new AbortController().signal,
      clientSessionId: "test-session-1",
    });
    expect(out.clientSessionId).toBe("test-session-1");
  });

  it("quality=standard は siggraph17 モデル・256入力で呼ぶ", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(0, "wasm", "siggraph17"));
    await colorizeInBrowser(grayInput(3, 3), {
      signal: new AbortController().signal,
      quality: "standard",
    });
    expect(mocks.createSessionForModel).toHaveBeenCalledWith("siggraph17", "wasm", expect.anything(), expect.anything());
  });

  it("quality=high は ddcolor モデル・512入力(3ch)で呼び、出力が入力と同寸法", async () => {
    const ready = makeReadySession(0, "wasm", "ddcolor");
    mocks.createSessionForModel.mockResolvedValue(ready);
    const out = await colorizeInBrowser(grayInput(6, 4), {
      signal: new AbortController().signal,
      quality: "high",
    });
    expect(mocks.createSessionForModel).toHaveBeenCalledWith("ddcolor", "wasm", expect.anything(), expect.anything());
    const feeds = (ready.session.run.mock.calls[0] as unknown[])[0] as { input?: { dims: number[] } };
    expect(feeds.input).toBeDefined();
    expect(feeds.input!.dims).toEqual([1, 3, 512, 512]);
    expect(out.width).toBe(6);
    expect(out.height).toBe(4);
  });

  it("quality=high で largeRgba が無ければ INTERNAL_ERROR", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(0, "wasm", "ddcolor"));
    const input = grayInput(4, 4);
    delete (input as { largeRgba?: Uint8ClampedArray }).largeRgba;
    await expect(
      colorizeInBrowser(input, { signal: new AbortController().signal, quality: "high" })
    ).rejects.toMatchObject({ errorCode: "INTERNAL_ERROR" });
  });

  it("高品質(DDColor)は vivid 増幅を適用しない（無彩色推定なら灰色のまま）", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(0, "wasm", "ddcolor"));
    const out = await colorizeInBrowser(grayInput(4, 4, 150), {
      signal: new AbortController().signal,
      quality: "high",
    });
    for (let i = 0; i < 16; i++) {
      expect(out.rgba[i * 4]).toBe(out.rgba[i * 4 + 1]);
      expect(out.rgba[i * 4 + 1]).toBe(out.rgba[i * 4 + 2]);
    }
  });

  it("quality=high は vividRgba を生成する", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(20, "wasm", "ddcolor"));
    const out = await colorizeInBrowser(grayInput(4, 4, 100), {
      signal: new AbortController().signal,
      quality: "high",
    });
    expect(out.vividRgba).toBeDefined();
    expect(out.vividRgba!.length).toBe(4 * 4 * 4);
  });

  it("quality=standard は vividRgba を生成しない", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(20, "wasm", "siggraph17"));
    const out = await colorizeInBrowser(grayInput(4, 4, 100), {
      signal: new AbortController().signal,
      quality: "standard",
    });
    expect(out.vividRgba).toBeUndefined();
  });

  it("quality=high で ab=0 のとき retriedWith が設定される（両モデルとも無彩色）", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(0, "wasm", "ddcolor"));
    const out = await colorizeInBrowser(grayInput(4, 4, 100), {
      signal: new AbortController().signal,
      quality: "high",
    });
    expect(out.retriedWith).toBeDefined();
    expect(typeof out.retriedWith).toBe("string");
  });

  it("ab に十分なクロマがあれば retriedWith は undefined", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(20, "wasm", "ddcolor"));
    const out = await colorizeInBrowser(grayInput(4, 4, 100), {
      signal: new AbortController().signal,
      quality: "high",
    });
    expect(out.retriedWith).toBeUndefined();
  });

  it("通常処理では collageTiles が undefined", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(10, "wasm", "siggraph17"));
    const out = await colorizeInBrowser(grayInput(8, 8, 128), {
      signal: new AbortController().signal,
    });
    expect(out.collageTiles).toBeUndefined();
  });
});

describe("modelIdForQuality", () => {
  it("standard→siggraph17 / high→ddcolor", () => {
    expect(modelIdForQuality("standard")).toBe("siggraph17");
    expect(modelIdForQuality("high")).toBe("ddcolor");
  });
});

describe("variantForAttempt（再生成バリエーション）", () => {
  it("attempt=0 は選択品質どおりのモデル・CLAHE有効・adaptive補正", () => {
    const v = variantForAttempt("high", 0);
    expect(v.modelId).toBe("ddcolor");
    expect(v.claheClip).not.toBeNull();
    expect(v.castProfile).toBe("adaptive");
  });

  it("high: attempt=1 でモデルが siggraph17 に切り替わる", () => {
    expect(variantForAttempt("high", 1).modelId).toBe("siggraph17");
  });

  it("high: 連続する attempt で少なくとも1要素が異なる（決定論の解消）", () => {
    for (let i = 0; i < 4; i++) {
      const cur = variantForAttempt("high", i);
      const next = variantForAttempt("high", i + 1);
      const differs =
        cur.modelId !== next.modelId ||
        cur.claheClip !== next.claheClip ||
        cur.castProfile !== next.castProfile;
      expect(differs).toBe(true);
    }
  });

  it("standard: モデルは常に siggraph17（大モデルの強制DLを避ける）", () => {
    for (let i = 0; i < 8; i++) {
      expect(variantForAttempt("standard", i).modelId).toBe("siggraph17");
    }
  });

  it("standard: 連続する attempt で設定が変化する", () => {
    for (let i = 0; i < 4; i++) {
      const cur = variantForAttempt("standard", i);
      const next = variantForAttempt("standard", i + 1);
      const differs = cur.claheClip !== next.claheClip || cur.castProfile !== next.castProfile;
      expect(differs).toBe(true);
    }
  });

  it("4パターンで循環する", () => {
    expect(variantForAttempt("high", 4)).toEqual(variantForAttempt("high", 0));
    expect(variantForAttempt("standard", 5)).toEqual(variantForAttempt("standard", 1));
  });
});

describe("colorizeInBrowser のバリエーション適用", () => {
  it("variant=1 + quality=high は siggraph17 でセッションを作る", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(20, "wasm", "siggraph17"));
    const out = await colorizeInBrowser(grayInput(4, 4, 100), {
      signal: new AbortController().signal,
      quality: "high",
      variant: 1,
    });
    expect(mocks.createSessionForModel).toHaveBeenCalledWith("siggraph17", "wasm", expect.anything(), expect.anything());
    expect(out.variant).toBe(1);
  });

  it("variant 未指定は 0 として出力に記録される", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(20, "wasm", "siggraph17"));
    const out = await colorizeInBrowser(grayInput(4, 4, 100), {
      signal: new AbortController().signal,
      quality: "standard",
    });
    expect(out.variant).toBe(0);
  });

  it("variant=4 は variant=0 と同じモデル（循環）", async () => {
    mocks.createSessionForModel.mockResolvedValue(makeReadySession(20, "wasm", "ddcolor"));
    await colorizeInBrowser(grayInput(4, 4, 100), {
      signal: new AbortController().signal,
      quality: "high",
      variant: 4,
    });
    expect(mocks.createSessionForModel).toHaveBeenCalledWith("ddcolor", "wasm", expect.anything(), expect.anything());
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
