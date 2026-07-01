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

async function startColorize() {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText("turnstile検証を完了する(テスト用)"));
  fireEvent.click(await screen.findByText("カラー化を開始する", {}, { timeout: 3000 }));
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
        requestId: "req-success-1",
      }),
    });

    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
    expect(screen.getByText("別の画像で試す")).toBeInTheDocument();
    expect(screen.getByAltText("AIでカラー化した後の写真")).toBeInTheDocument();
  });

  it("retryable=trueのAPIエラー: 見出し・エラーコード・requestIdと「同じ画像でもう一度試す」が表示される", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        errorCode: "MODEL_EXECUTION_FAILED",
        userMessage: "カラー化処理中にエラーが発生しました。もう一度お試しいただくか、別の画像でお試しください。",
        retryable: true,
        requestId: "req-model-exec-1",
      }),
    });

    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("カラー化に失敗しました");
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "カラー化処理中にエラーが発生しました。もう一度お試しいただくか、別の画像でお試しください。"
    );
    expect(screen.getByRole("alert")).toHaveTextContent("MODEL_EXECUTION_FAILED");
    expect(screen.getByRole("alert")).toHaveTextContent("req-model-exec-1");
    expect(screen.getByText("同じ画像でもう一度試す")).toBeInTheDocument();
    expect(screen.getByText("別の画像で試す")).toBeInTheDocument();
  });

  it("retryable=falseのAPIエラー(RATE_LIMITED): 「同じ画像でもう一度試す」は出ないが「別の画像で試す」は出る", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        errorCode: "RATE_LIMITED",
        userMessage: "本日ご利用いただける無料回数の上限に達しました。日付が変わってから再度お試しください。",
        retryable: false,
        requestId: "req-rate-limited-1",
      }),
    });

    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("本日の利用上限に達しました");
    });
    expect(screen.queryByText("同じ画像でもう一度試す")).not.toBeInTheDocument();
    expect(screen.getByText("別の画像で試す")).toBeInTheDocument();
  });

  it("設定不備系エラー(REPLICATE_BILLING_REQUIRED): 別の画像を促さず「はじめからやり直す」を出す", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        errorCode: "REPLICATE_BILLING_REQUIRED",
        userMessage: "サービス側の準備が完了していないため、現在この機能をご利用いただけません。しばらくしてから再度お試しください。",
        retryable: false,
        requestId: "req-billing-1",
      }),
    });

    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("サービス側の準備が完了していません");
    });
    expect(screen.queryByText("同じ画像でもう一度試す")).not.toBeInTheDocument();
    expect(screen.queryByText("別の画像で試す")).not.toBeInTheDocument();
    expect(screen.getByText("はじめからやり直す")).toBeInTheDocument();
  });

  it("ネットワークエラー(fetch自体が失敗): 汎用メッセージと再試行導線が出る", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));

    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("通信エラーが発生しました");
    });
    expect(screen.getByRole("alert")).toHaveTextContent("ネットワークエラーが発生しました。接続を確認して再度お試しください。");
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
        requestId: "req-success-2",
      }),
    });

    await selectFileAndReachReady();
    await startColorize();

    await waitFor(() => {
      expect(screen.getByText("結果画像を保存する")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("別の画像で試す"));
    await waitFor(() => {
      expect(screen.getByText("画像を選ぶ")).toBeInTheDocument();
    });
  });
});
