import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoColorizeClient } from "../PhotoColorizeClient";

vi.mock("../imageProcessing", async () => {
  const actual = await vi.importActual<typeof import("../imageProcessing")>("../imageProcessing");
  return {
    ...actual,
    prepareImageForUpload: vi.fn().mockResolvedValue({
      blob: new Blob(["fake"], { type: "image/jpeg" }),
      previewUrl: "blob:fake-preview",
      width: 400,
      height: 300,
    }),
    revokePreviewUrl: vi.fn(),
  };
});

vi.mock("../TurnstileWidget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (t: string | null) => void }) => (
    <button type="button" onClick={() => onToken("fake-turnstile-token")}>
      turnstile検証を完了する(テスト用)
    </button>
  ),
}));

function makeFile() {
  return new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  if (!("createObjectURL" in URL)) {
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(), writable: true });
  }
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-download");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function selectFileAndReachReady() {
  render(<PhotoColorizeClient turnstileSiteKey="test-site-key" toolEnabled />);
  const input = screen.getByLabelText(/画像を選ぶ|白黒写真をドラッグ/, { selector: "input" }) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [makeFile()] } });
  await waitFor(() => {
    expect(screen.getByText("カラー化を開始する")).toBeInTheDocument();
  });
}

describe("PhotoColorizeClient", () => {
  it("toolEnabled=falseの場合は準備中メッセージを表示しアップロードUIを出さない", () => {
    render(<PhotoColorizeClient turnstileSiteKey="" toolEnabled={false} />);
    expect(screen.getByText(/準備中のため、ご利用いただけません/)).toBeInTheDocument();
    expect(screen.queryByText("画像を選ぶ")).not.toBeInTheDocument();
  });

  it("画像選択後、プレビューと開始ボタン(同意・turnstile未完了は無効)が表示される", async () => {
    await selectFileAndReachReady();
    const startBtn = screen.getByText("カラー化を開始する") as HTMLButtonElement;
    expect(startBtn).toBeDisabled();
  });

  it("削除ボタンで選択前の状態に戻る", async () => {
    await selectFileAndReachReady();
    fireEvent.click(screen.getByText("画像を削除して選び直す"));
    await waitFor(() => {
      expect(screen.getByText("画像を選ぶ")).toBeInTheDocument();
    });
  });

  it("同意チェックとturnstile完了後にのみ開始ボタンが有効になる", async () => {
    await selectFileAndReachReady();
    const startBtn = screen.getByText("カラー化を開始する") as HTMLButtonElement;
    fireEvent.click(screen.getByRole("checkbox"));
    expect(startBtn).toBeDisabled();
    fireEvent.click(screen.getByText("turnstile検証を完了する(テスト用)"));
    await waitFor(() => expect(startBtn).not.toBeDisabled());
  });

  it("開始→成功で結果(Before/After・保存・再試行)が表示される", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        resultUrl: "https://replicate.delivery/result.png",
        model: "piddnad/ddcolor",
        warnings: [],
      }),
    });

    await selectFileAndReachReady();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("turnstile検証を完了する(テスト用)"));
    fireEvent.click(await screen.findByText("カラー化を開始する", {}, { timeout: 3000 }));

    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
    expect(screen.getByText("別の画像で試す")).toBeInTheDocument();
    expect(screen.getByAltText("AIでカラー化した後の写真")).toBeInTheDocument();
  });

  it("開始→APIエラーでエラー表示と再試行導線が出る", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        code: "RATE_LIMITED",
        message: "本日の無料利用上限に達しました。",
      }),
    });

    await selectFileAndReachReady();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("turnstile検証を完了する(テスト用)"));
    fireEvent.click(screen.getByText("カラー化を開始する"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("本日の無料利用上限に達しました。");
    });
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
  });

  it("結果画面で「別の画像で試す」を押すと選択前の状態に戻る", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        resultUrl: "https://replicate.delivery/result.png",
        model: "piddnad/ddcolor",
        warnings: [],
      }),
    });

    await selectFileAndReachReady();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("turnstile検証を完了する(テスト用)"));
    fireEvent.click(screen.getByText("カラー化を開始する"));

    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("別の画像で試す"));
    await waitFor(() => {
      expect(screen.getByText("画像を選ぶ")).toBeInTheDocument();
    });
  });
});
