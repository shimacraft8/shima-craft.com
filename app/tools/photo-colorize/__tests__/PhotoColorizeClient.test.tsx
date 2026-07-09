import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PhotoColorizeClient } from "../PhotoColorizeClient";
import { ColorizeError } from "@/lib/colorization/types";

const mocks = vi.hoisted(() => ({
  prepareImageForColorize: vi.fn(),
  revokePreviewUrl: vi.fn(),
  colorizeInBrowser: vi.fn(),
}));

vi.mock("../imageProcessing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../imageProcessing")>();
  return {
    ...actual,
    prepareImageForColorize: mocks.prepareImageForColorize,
    revokePreviewUrl: mocks.revokePreviewUrl,
  };
});

vi.mock("@/lib/colorization/browser/browserColorize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/colorization/browser/browserColorize")>();
  return { ...actual, colorizeInBrowser: mocks.colorizeInBrowser };
});

function makeFile() {
  return new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });
}

function preparedImage(overrides: Record<string, unknown> = {}) {
  return {
    fullRgba: new Uint8ClampedArray(400 * 300 * 4),
    width: 400,
    height: 300,
    smallRgba: new Uint8ClampedArray(256 * 256 * 4),
    previewUrl: "blob:fake-preview",
    resizedFrom: null,
    sourceFileSize: 123456,
    warnings: [],
    ...overrides,
  };
}

function successOutput(overrides: Record<string, unknown> = {}) {
  return {
    rgba: new Uint8ClampedArray(400 * 300 * 4),
    width: 400,
    height: 300,
    backend: "webgpu" as const,
    clientSessionId: "cs-test-1",
    timings: { modelDownloadMs: 100, initMs: 50, inferMs: 200, compositeMs: 30 },
    grayStructureMAD: 0.05,
    warnings: [],
    ...overrides,
  };
}

class FakeImageData {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
}

let fetchMock: ReturnType<typeof vi.fn>;
let execCounter = 0;

beforeEach(() => {
  mocks.prepareImageForColorize.mockReset().mockResolvedValue(preparedImage());
  mocks.revokePreviewUrl.mockReset();
  mocks.colorizeInBrowser.mockReset();
  execCounter = 0;

  fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes("/api/colorize/executions")) {
      execCounter += 1;
      return new Response(JSON.stringify({ ok: true, executionId: `exec-${execCounter}` }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);

  vi.stubGlobal("ImageData", FakeImageData);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    configurable: true,
    writable: true,
    value(cb: (b: Blob | null) => void) {
      cb(new Blob(["fake-jpeg"], { type: "image/jpeg" }));
    },
  });

  if (!("createObjectURL" in URL)) {
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(), writable: true });
  }
  if (!("revokeObjectURL" in URL)) {
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), writable: true });
  }
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-result");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderClient() {
  return render(<PhotoColorizeClient contactHref="mailto:test@example.com" isAnonymous={false} />);
}

async function selectFileAndReachReady() {
  renderClient();
  const input = document.getElementById("colorize-file-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [makeFile()] } });
  await waitFor(() => expect(screen.getByText("カラー化を開始する")).toBeInTheDocument());
}

async function startColorize() {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText("カラー化を開始する"));
}

function eventBodies() {
  return fetchMock.mock.calls
    .filter(([u]) => String(u).includes("/api/colorize/events"))
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

describe("PhotoColorizeClient（Firebase会員フロー）", () => {
  it("会員向けのAI送信説明が表示される", () => {
    renderClient();
    expect(
      screen.getByText(/写真の縮小版（最大512px）をSHIMA CRAFTサーバー経由でGroq AI/)
    ).toBeInTheDocument();
  });

  it("同意するまで開始ボタンが無効", async () => {
    await selectFileAndReachReady();
    const btn = screen.getByText("カラー化を開始する") as HTMLButtonElement;
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it("開始時にまず実行許可APIを呼び、成功後にカラー化する", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalled());
    // executions が colorizeInBrowser より前に呼ばれる
    const execCall = fetchMock.mock.calls.findIndex(([u]) => String(u).includes("/api/colorize/executions"));
    expect(execCall).toBeGreaterThanOrEqual(0);
    const [, opts] = mocks.colorizeInBrowser.mock.calls[0];
    expect(opts.finish).toBe("vivid");
  });

  it("実行許可が拒否されたらモデルを読み込まずエラー表示", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/api/colorize/executions")) {
        return new Response(JSON.stringify({ ok: false, reason: "NOT_ALLOWED" }), { status: 403 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mocks.colorizeInBrowser).not.toHaveBeenCalled();
  });

  it("成功でBefore/After・保存・再試行が表示される", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => expect(screen.getByText("結果画像を保存する")).toBeInTheDocument());
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
  });

  it("成功時に colorize_succeeded イベントが送られ、画像データを含まない", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));

    const events = eventBodies();
    expect(events.some((e) => e.eventType === "colorize_succeeded")).toBe(true);
    for (const e of events) {
      const raw = JSON.stringify(e);
      expect(raw).not.toContain("blob:");
      expect(raw).not.toContain("base64");
      expect(e.rgba).toBeUndefined();
      expect(e.executionId).toMatch(/^exec-/);
    }
  });

  it("ダウンロード操作で download_clicked が送られる", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));
    fireEvent.click(screen.getByText("結果画像を保存する"));
    expect(eventBodies().some((e) => e.eventType === "download_clicked")).toBe(true);
  });
});

describe("同じ画像でもう一度試す（回帰テスト）", () => {
  it("成功後の再試行で新しいexecutionIdで直接再実行され、再度成功する", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));

    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2));
    await waitFor(() => screen.getByText("結果画像を保存する"));
    expect(mocks.prepareImageForColorize).toHaveBeenCalledTimes(1);

    // 実行許可APIが2回呼ばれ、2回目は retryOf に前回IDが付く
    const execBodies = fetchMock.mock.calls
      .filter(([u]) => String(u).includes("/api/colorize/executions"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(execBodies.length).toBe(2);
    expect(execBodies[1].retryOfExecutionId).toBe("exec-1");
  });

  it("失敗後の再試行で古いエラーが消え、成功に到達できる", async () => {
    mocks.colorizeInBrowser
      .mockRejectedValueOnce(new ColorizeError("COLORIZATION_FAILED", "cs-1"))
      .mockResolvedValueOnce(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));
    await waitFor(() => screen.getByText("結果画像を保存する"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2);
  });

  it("再試行ごとに新しいclientSessionId・AbortControllerが使われる", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));
    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2));

    const o1 = mocks.colorizeInBrowser.mock.calls[0][1];
    const o2 = mocks.colorizeInBrowser.mock.calls[1][1];
    expect(o1.clientSessionId).not.toBe(o2.clientSessionId);
    expect(o1.signal).not.toBe(o2.signal);
    expect(o2.signal.aborted).toBe(false);
  });

  it("完了ログAPIの応答が遅くても直後の再試行が無視されない（回帰）", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/api/colorize/executions")) {
        execCounter += 1;
        return Promise.resolve(new Response(JSON.stringify({ ok: true, executionId: `exec-${execCounter}` }), { status: 200 }));
      }
      // events は永遠に解決しない
      return new Promise(() => {});
    });
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));
    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2));
    await waitFor(() => screen.getByText("結果画像を保存する"));
  });

  it("2回以上連続で再試行できる", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    for (let i = 0; i < 2; i++) {
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => screen.getByText("同じ画像でもう一度試す"));
      fireEvent.click(screen.getByText("同じ画像でもう一度試す"));
    }
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(3));
    await waitFor(() => screen.getByText("結果画像を保存する"));
  });

  it("キャンセル後に同じ画像で再実行して成功できる", async () => {
    mocks.colorizeInBrowser
      .mockImplementationOnce(
        (_input: unknown, opts: { signal: AbortSignal; clientSessionId?: string }) =>
          new Promise((_res, reject) => {
            opts.signal.addEventListener("abort", () =>
              reject(new ColorizeError("PROCESS_CANCELLED", opts.clientSessionId ?? "cs"))
            );
          })
      )
      .mockResolvedValueOnce(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    fireEvent.click(await screen.findByText("キャンセル"));
    await waitFor(() => screen.getByText("カラー化を開始する"));
    fireEvent.click(screen.getByText("カラー化を開始する"));
    await waitFor(() => screen.getByText("結果画像を保存する"));
  });

  it("処理中の多重起動を防止する", async () => {
    let resolveRun: ((v: unknown) => void) | null = null;
    mocks.colorizeInBrowser.mockImplementation(() => new Promise((res) => { resolveRun = res; }));
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText("キャンセル"));
    act(() => resolveRun?.(successOutput()));
    await waitFor(() => screen.getByText("結果画像を保存する"));
    expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(1);
  });
});
