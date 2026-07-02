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
  };
}

class FakeImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number
  ) {}
}

beforeEach(() => {
  mocks.prepareImageForColorize.mockReset().mockResolvedValue(preparedImage());
  mocks.revokePreviewUrl.mockReset();
  mocks.colorizeInBrowser.mockReset();

  // jsdom には canvas 2D / ImageData がないためスタブする
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

async function selectFileAndReachReady() {
  render(<PhotoColorizeClient toolEnabled />);
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

describe("PhotoColorizeClient", () => {
  it("toolEnabled=falseの場合は一時停止メッセージを表示しアップロードUIを出さない", () => {
    render(<PhotoColorizeClient toolEnabled={false} />);
    expect(screen.getByText(/試験提供を一時停止しています/)).toBeInTheDocument();
    expect(screen.queryByText("画像を選ぶ")).not.toBeInTheDocument();
  });

  it("選択画面に端末内処理の説明が表示される", () => {
    render(<PhotoColorizeClient toolEnabled />);
    expect(screen.getByText(/端末内（お使いのブラウザの中）で処理されます/)).toBeInTheDocument();
    expect(screen.getByText(/外部AIサービスへ送信されません/)).toBeInTheDocument();
  });

  it("画像選択後、同意するまで開始ボタンが無効", async () => {
    await selectFileAndReachReady();
    const startBtn = screen.getByText("カラー化を開始する") as HTMLButtonElement;
    expect(startBtn).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(startBtn).not.toBeDisabled());
  });

  it("初回モデル読み込みの説明が表示される", async () => {
    await selectFileAndReachReady();
    expect(screen.getByText(/初回はカラー化モデル/)).toBeInTheDocument();
    expect(screen.getByText(/2回目以降は/)).toBeInTheDocument();
  });

  it("縮小して処理する場合はその旨を明示する", async () => {
    mocks.prepareImageForColorize.mockResolvedValue(
      preparedImage({ resizedFrom: { width: 4000, height: 3000 } })
    );
    await selectFileAndReachReady();
    expect(screen.getByText(/4000×3000/)).toBeInTheDocument();
    expect(screen.getByText(/縮小して処理します/)).toBeInTheDocument();
  });

  it("削除ボタンで選択前の状態に戻り、プレビューURLを解放する", async () => {
    await selectFileAndReachReady();
    fireEvent.click(screen.getByText("画像を削除して選び直す"));
    await waitFor(() => {
      expect(screen.getByText("画像を選ぶ")).toBeInTheDocument();
    });
    expect(mocks.revokePreviewUrl).toHaveBeenCalledWith("blob:fake-preview");
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
    expect(screen.getByAltText("AIでカラー化した後の写真")).toBeInTheDocument();
  });

  it("処理中はモデルダウンロード進捗とキャンセルボタンが表示される", async () => {
    let sendProgress: ((p: ColorizeProgress) => void) | null = null;
    mocks.colorizeInBrowser.mockImplementation(
      (_input: unknown, opts: { onProgress: (p: ColorizeProgress) => void }) => {
        sendProgress = opts.onProgress;
        return new Promise(() => {}); // 完了しない
      }
    );
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByText("キャンセル")).toBeInTheDocument();
    });
    act(() => {
      sendProgress?.({ stage: "downloading_model", loadedBytes: 34_000_000, totalBytes: 68_000_000 });
    });
    // sr-only のライブリージョンにも同じ文言が出るため getAllByText を使う
    expect(screen.getAllByText(/カラー化モデルをダウンロード中… 50%/).length).toBeGreaterThan(0);
    act(() => {
      sendProgress?.({ stage: "inferring", backend: "webgpu" });
    });
    expect(screen.getAllByText(/AIが色を推定しています/).length).toBeGreaterThan(0);
  });

  it("キャンセルすると ready へ戻る", async () => {
    mocks.colorizeInBrowser.mockImplementation(
      (_input: unknown, opts: { signal: AbortSignal; clientSessionId?: string }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () =>
            reject(new ColorizeError("PROCESS_CANCELLED", opts.clientSessionId ?? "cs"))
          );
        })
    );
    await selectFileAndReachReady();
    await startColorize();

    fireEvent.click(await screen.findByText("キャンセル"));
    await waitFor(() => {
      expect(screen.getByText("カラー化を開始する")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("MODEL_DOWNLOAD_FAILED: 見出し・コード・セッションID・次の行動が表示され、画像を疑わせない", async () => {
    mocks.colorizeInBrowser.mockRejectedValue(new ColorizeError("MODEL_DOWNLOAD_FAILED", "cs-err-1"));
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("カラー化モデルを読み込めませんでした");
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("MODEL_DOWNLOAD_FAILED");
    expect(alert).toHaveTextContent("cs-err-1");
    expect(alert).toHaveTextContent("通信環境の良い場所で再試行してください");
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
    expect(screen.queryByText("別の画像で試す")).not.toBeInTheDocument();
    expect(screen.getByText("はじめからやり直す")).toBeInTheDocument();
  });

  it("UNSUPPORTED_BROWSER: 再試行ボタンを出さない", async () => {
    mocks.colorizeInBrowser.mockRejectedValue(new ColorizeError("UNSUPPORTED_BROWSER", "cs-err-2"));
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("お使いのブラウザではご利用いただけません");
    });
    expect(screen.queryByText("同じ画像でもう一度試す")).not.toBeInTheDocument();
  });

  it("OUT_OF_MEMORY: 画像側の問題として「別の画像で試す」を出す", async () => {
    mocks.colorizeInBrowser.mockRejectedValue(new ColorizeError("OUT_OF_MEMORY", "cs-err-3"));
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("端末のメモリが不足しています");
    });
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
    expect(screen.getByText("別の画像で試す")).toBeInTheDocument();
  });

  it("低解像度警告が結果画面に表示される", async () => {
    mocks.prepareImageForColorize.mockResolvedValue(preparedImage({ warnings: ["low_resolution"] }));
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByText(/解像度が低いため/)).toBeInTheDocument();
    });
  });

  it("結果画面で「別の画像で試す」を押すと選択前の状態に戻りURLを解放する", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("別の画像で試す"));
    await waitFor(() => {
      expect(screen.getByText("画像を選ぶ")).toBeInTheDocument();
    });
    expect(mocks.revokePreviewUrl).toHaveBeenCalledWith("blob:fake-preview");
    expect(mocks.revokePreviewUrl).toHaveBeenCalledWith("blob:mock-result");
  });

  it("colorizeInBrowser には画像のピクセルデータのみが渡され、Fileは渡されない", async () => {
    mocks.colorizeInBrowser.mockResolvedValue(successOutput());
    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => expect(mocks.colorizeInBrowser).toHaveBeenCalled());
    const [input] = mocks.colorizeInBrowser.mock.calls[0];
    expect(input.fullRgba).toBeInstanceOf(Uint8ClampedArray);
    expect(input.width).toBe(400);
    expect(input.height).toBe(300);
  });
});
