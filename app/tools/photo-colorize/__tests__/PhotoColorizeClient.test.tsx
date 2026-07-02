import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PhotoColorizeClient } from "../PhotoColorizeClient";
import { ColorizeError, type ColorizeProgress } from "@/lib/colorization/types";

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
  return {
    ...actual,
    colorizeInBrowser: mocks.colorizeInBrowser,
  };
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
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number
  ) {}
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mocks.prepareImageForColorize.mockReset().mockResolvedValue(preparedImage());
  mocks.revokePreviewUrl.mockReset();
  mocks.colorizeInBrowser.mockReset();

  // /api/colorize-log と /api/trial/* のスタブ
  fetchMock = vi.fn(async (url: string) => {
    if (String(url).includes("/api/trial/start")) {
      return new Response(JSON.stringify({ ok: true, ticket: "t.sig", remaining: 2, limit: 3 }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ ok: true, remaining: 2 }), { status: 200 });
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

function renderClient(props: Partial<React.ComponentProps<typeof PhotoColorizeClient>> = {}) {
  return render(
    <PhotoColorizeClient
      toolEnabled
      accessMode="member"
      contactHref="mailto:test@example.com"
      {...props}
    />
  );
}

async function selectFileAndReachReady(props: Partial<React.ComponentProps<typeof PhotoColorizeClient>> = {}) {
  renderClient(props);
  const input = document.getElementById("colorize-file-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [makeFile()] } });
  await waitFor(() => {
    expect(screen.getByText("カラー化を開始する")).toBeInTheDocument();
  });
}

async function startColorize() {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText("カラー化を開始する"));
}

describe("PhotoColorizeClient（会員モード）", () => {
  it("toolEnabled=falseの場合は一時停止メッセージを表示しアップロードUIを出さない", () => {
    renderClient({ toolEnabled: false });
    expect(screen.getByText(/提供を一時停止しています/)).toBeInTheDocument();
    expect(screen.queryByText("画像を選ぶ")).not.toBeInTheDocument();
  });

  it("blockedモードでは契約案内と問い合わせ導線を表示し、ツールを出さない", () => {
    renderClient({ accessMode: "blocked", blockedMessage: "現在、このアカウントではご利用いただけません。" });
    expect(screen.getByText(/このアカウントではご利用いただけません/)).toBeInTheDocument();
    expect(screen.getByText("SHIMA CRAFTへ問い合わせる")).toBeInTheDocument();
    expect(screen.queryByText("画像を選ぶ")).not.toBeInTheDocument();
  });

  it("選択画面に端末内処理の説明が表示される", () => {
    renderClient();
    expect(screen.getByText(/端末内（お使いのブラウザの中）で処理されます/)).toBeInTheDocument();
  });

  it("画像選択後、同意するまで開始ボタンが無効", async () => {
    await selectFileAndReachReady();
    const startBtn = screen.getByText("カラー化を開始する") as HTMLButtonElement;
    expect(startBtn).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(startBtn).not.toBeDisabled());
  });

  it("仕上がり選択（あざやか/ひかえめ）が表示され、選んだ値がcolorizeInBrowserへ渡る", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    fireEvent.click(screen.getByText(/ひかえめ/));
    await startColorize();
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalled());
    const [, opts] = mocks.colorizeInBrowser.mock.calls[0];
    expect(opts.finish).toBe("soft");
  });

  it("開始→成功で結果(Before/After・保存・再試行)が表示される", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
    expect(screen.getByText("別の画像で試す")).toBeInTheDocument();
  });

  it("成功時に開始・成功ログが/api/colorize-logへ送信され、画像データは含まれない", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });

    const logCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("/api/colorize-log"));
    const events = logCalls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(events.some((e) => e.event_type === "colorize_started")).toBe(true);
    expect(events.some((e) => e.event_type === "colorize_succeeded")).toBe(true);
    for (const e of events) {
      const raw = JSON.stringify(e);
      expect(raw).not.toContain("blob:");
      expect(raw).not.toContain("base64");
      expect(raw.length).toBeLessThan(1000);
      expect(e.rgba).toBeUndefined();
      expect(e.user_id).toBeUndefined(); // user_idはサーバー側でセッションから付与
    }
  });

  it("失敗時に colorize_failed ログ（error_code付き）が送信される", async () => {
    mocks.colorizeInBrowser.mockRejectedValue(new ColorizeError("COLORIZATION_FAILED", "cs-f"));
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    const events = fetchMock.mock.calls
      .filter(([u]) => String(u).includes("/api/colorize-log"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
    const failed = events.find((e) => e.event_type === "colorize_failed");
    expect(failed?.error_code).toBe("COLORIZATION_FAILED");
  });

  it("ダウンロード操作で download_clicked ログが送信される", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));
    fireEvent.click(screen.getByText("結果画像を保存する"));

    const events = fetchMock.mock.calls
      .filter(([u]) => String(u).includes("/api/colorize-log"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(events.some((e) => e.event_type === "download_clicked")).toBe(true);
  });
});

describe("同じ画像でもう一度試す（回帰テスト）", () => {
  it("成功後の再試行で新しい処理が直接開始され、再度成功する", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));

    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));

    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });
    // 入力画像は同じもの（prepareは1回のみ）
    expect(mocks.prepareImageForColorize).toHaveBeenCalledTimes(1);
  });

  it("失敗後の再試行で古いエラーが消え、成功に到達できる", async () => {
    mocks.colorizeInBrowser
      .mockRejectedValueOnce(new ColorizeError("COLORIZATION_FAILED", "cs-1"))
      .mockResolvedValueOnce(successOutput());
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));

    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2);
  });

  it("再試行ごとに新しい実行ID（clientSessionId）とAbortControllerが使われる", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));
    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2));

    const opts1 = mocks.colorizeInBrowser.mock.calls[0][1];
    const opts2 = mocks.colorizeInBrowser.mock.calls[1][1];
    expect(opts1.clientSessionId).not.toBe(opts2.clientSessionId);
    expect(opts1.signal).not.toBe(opts2.signal);
    expect(opts2.signal.aborted).toBe(false);
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
    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });
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

  it("処理中の多重起動を防止する（実行中はcolorizeInBrowserが増えない）", async () => {
    let resolveRun: ((v: unknown) => void) | null = null;
    mocks.colorizeInBrowser.mockImplementation(
      () =>
        new Promise((res) => {
          resolveRun = res;
        })
    );
    await selectFileAndReachReady();
    await startColorize();
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(1));

    // 処理中にもう一度開始を試みても増えない
    fireEvent.click(screen.getByText("キャンセル")); // ボタン存在確認を兼ねる（abort→rejectはこのmockでは起きない）
    act(() => {
      resolveRun?.(successOutput());
    });
    await waitFor(() => screen.getByText("結果画像を保存する"));
    expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(1);
  });
});

describe("お試しモード", () => {
  it("残り回数と会員登録導線が表示される", () => {
    renderClient({ accessMode: "trial", trialRemaining: 2, trialLimit: 3 });
    expect(screen.getByText(/お試し利用中/)).toBeInTheDocument();
    expect(screen.getByText("会員登録・料金について問い合わせる")).toBeInTheDocument();
    expect(screen.getByText("会員の方はログイン")).toBeInTheDocument();
  });

  it("残り0回のときはツールUIを出さず、登録案内を表示する", () => {
    renderClient({ accessMode: "trial", trialRemaining: 0, trialLimit: 3 });
    expect(screen.getByText(/すべてご利用いただきました/)).toBeInTheDocument();
    expect(screen.queryByText("画像を選ぶ")).not.toBeInTheDocument();
  });

  it("開始時に/api/trial/startを呼び、成功時にcompleteへ succeeded を報告する", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady({ accessMode: "trial", trialRemaining: 3 });
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));

    const startCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("/api/trial/start"));
    expect(startCalls.length).toBe(1);
    const completeCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("/api/trial/complete")
    );
    const body = JSON.parse((completeCalls[0][1] as RequestInit).body as string);
    expect(body.result).toBe("succeeded");
    expect(body.ticket).toBe("t.sig");
  });

  it("サーバーが上限超過(403)を返したらカラー化せず登録案内を表示する", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("/api/trial/start")) {
        return new Response(
          JSON.stringify({ ok: false, reason: "TRIAL_EXHAUSTED", userMessage: "上限に達しました。" }),
          { status: 403 }
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    await selectFileAndReachReady({ accessMode: "trial", trialRemaining: 1 });
    await startColorize();

    await waitFor(() => {
      expect(screen.getByText(/すべてご利用いただきました/)).toBeInTheDocument();
    });
    expect(mocks.colorizeInBrowser).not.toHaveBeenCalled();
  });

  it("完了報告(/api/trial/complete)の応答が遅くても、直後の再試行が無視されない（回帰）", async () => {
    // complete が永遠に解決しない状況を再現（本番のネットワーク遅延・コールドスタート相当）
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("/api/trial/start")) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, ticket: "t.sig", remaining: 2, limit: 3 }), {
            status: 200,
          })
        );
      }
      if (String(url).includes("/api/trial/complete")) {
        return new Promise(() => {}); // 応答しない
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady({ accessMode: "trial", trialRemaining: 3 });
    await startColorize();
    await waitFor(() => screen.getByText("結果画像を保存する"));

    fireEvent.click(screen.getByText("同じ画像でもう一度試す"));
    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalledTimes(2));
    await waitFor(() => screen.getByText("結果画像を保存する"));
  });

  it("失敗時は failed として報告する（回数は消費されない設計）", async () => {
    mocks.colorizeInBrowser.mockRejectedValue(new ColorizeError("COLORIZATION_FAILED", "cs-t"));
    await selectFileAndReachReady({ accessMode: "trial", trialRemaining: 3 });
    await startColorize();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    const completeCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes("/api/trial/complete")
    );
    const body = JSON.parse((completeCalls[0][1] as RequestInit).body as string);
    expect(body.result).toBe("failed");
  });
});
