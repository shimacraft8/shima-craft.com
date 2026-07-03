"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/app/components/TrackedLink";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import {
  ImageProcessingError,
  buildDownloadFilename,
  prepareImageForColorize,
  revokePreviewUrl,
  type PreparedImage,
} from "./imageProcessing";
import {
  colorizeInBrowser,
  newClientSessionId,
  type ColorizeFinish,
} from "@/lib/colorization/browser/browserColorize";
import {
  COLORIZE_ERROR_HEADINGS,
  COLORIZE_ERROR_IS_ENVIRONMENT_ISSUE,
  COLORIZE_ERROR_NEXT_ACTIONS,
  ColorizeError,
  type ColorizeProgress,
} from "@/lib/colorization/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Phase = "select" | "ready" | "processing" | "done" | "error";

type Props = {
  contactHref: string;
};

type ErrorDisplay = {
  heading: string;
  message: string;
  errorCode: string;
  retryable: boolean;
  clientSessionId: string | null;
  nextAction: string | null;
  suggestDifferentImage: boolean;
};

function buildErrorDisplay(err: ColorizeError): ErrorDisplay {
  return {
    heading: COLORIZE_ERROR_HEADINGS[err.errorCode] ?? "エラーが発生しました",
    message: err.message,
    errorCode: err.errorCode,
    retryable: err.errorCode !== "UNSUPPORTED_BROWSER" && err.errorCode !== "WASM_INITIALIZATION_FAILED",
    clientSessionId: err.clientSessionId,
    nextAction: COLORIZE_ERROR_NEXT_ACTIONS[err.errorCode] ?? null,
    suggestDifferentImage: !COLORIZE_ERROR_IS_ENVIRONMENT_ISSUE[err.errorCode],
  };
}

function progressLabel(p: ColorizeProgress | null): string {
  if (!p) return "準備しています…";
  switch (p.stage) {
    case "downloading_model": {
      if (p.totalBytes) {
        const pct = Math.min(100, Math.round((p.loadedBytes / p.totalBytes) * 100));
        return `カラー化モデルをダウンロード中… ${pct}%`;
      }
      return `カラー化モデルをダウンロード中… ${(p.loadedBytes / 1e6).toFixed(0)}MB`;
    }
    case "initializing":
      return "カラー化モデルを準備しています…";
    case "inferring":
      return "AIが色を推定しています…";
    case "compositing":
      return "元の写真と色を合成しています…";
  }
}

/** イベントを利用ログAPIへ送る（fire-and-forget。画像データは含まない）。 */
function sendEvent(payload: Record<string, unknown>): void {
  try {
    void fetch("/api/colorize/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // ログ失敗は利用を妨げない
  }
}

export function PhotoColorizeClient({ contactHref }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [finish, setFinish] = useState<ColorizeFinish>("vivid");
  const [progress, setProgress] = useState<ColorizeProgress | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorDisplay, setErrorDisplay] = useState<ErrorDisplay | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  /** 実行中の多重起動防止（stateのphaseはクロージャで古くなるためrefで判定する） */
  const inFlightRef = useRef(false);
  const modelDownloadLoggedRef = useRef(false);
  const lastResultMetaRef = useRef<{ mode?: string; executionId?: string } | null>(null);
  /** 直近のexecutionId（download_clickedログ用） */
  const lastExecutionIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      revokePreviewUrl(prepared?.previewUrl);
      revokePreviewUrl(resultUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAll = useCallback(() => {
    abortRef.current?.abort();
    runIdRef.current += 1;
    revokePreviewUrl(prepared?.previewUrl);
    revokePreviewUrl(resultUrl);
    setPrepared(null);
    setPreparing(false);
    setSelectError(null);
    setConsent(false);
    setProgress(null);
    setResultUrl(null);
    setWarnings([]);
    setErrorDisplay(null);
    setPhase("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [prepared, resultUrl]);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setSelectError(null);
      if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
        setSelectError("JPEG・PNG・WebPの画像を選択してください。");
        return;
      }
      revokePreviewUrl(prepared?.previewUrl);
      setPrepared(null);
      setPreparing(true);
      try {
        const result = await prepareImageForColorize(file);
        setPrepared(result);
        setPhase("ready");
        trackEvent("colorize_file_select");
      } catch (err) {
        setSelectError(
          err instanceof ImageProcessingError
            ? err.message
            : "画像の読み込みに失敗しました。別の画像でお試しください。"
        );
      } finally {
        setPreparing(false);
      }
    },
    [prepared]
  );

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  function handleRemoveImage() {
    resetAll();
  }

  /** サーバーへ実行許可を要求し、executionIdを得る（モデル読込はこの後に開始）。 */
  async function requestExecution(retryOf: string | null): Promise<string | null> {
    if (!prepared) return null;
    try {
      const res = await fetch("/api/colorize/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputWidth: prepared.width,
          inputHeight: prepared.height,
          inputFileSize: prepared.sourceFileSize,
          clientRequestId: newClientSessionId(),
          retryOfExecutionId: retryOf,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; executionId?: string } | null;
      if (res.ok && data?.ok && data.executionId) return data.executionId;
      return null;
    } catch {
      return null;
    }
  }

  async function runColorize(selectedFinish: ColorizeFinish, retryOf: string | null) {
    if (!prepared || inFlightRef.current) return;
    inFlightRef.current = true;
    // 実行のたびに新しいAbortController・実行IDを作る
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = ++runIdRef.current;
    const clientSessionId = newClientSessionId();
    modelDownloadLoggedRef.current = false;

    setPhase("processing");
    setProgress(null);
    setErrorDisplay(null);
    trackEvent("colorize_start");

    // 実行許可（fail-closed）: これが取れないとモデルを読み込まない
    const executionId = await requestExecution(retryOf);
    if (runIdRef.current !== runId) {
      inFlightRef.current = false;
      return;
    }
    if (!executionId) {
      inFlightRef.current = false;
      setErrorDisplay(
        buildErrorDisplay(new ColorizeError("INTERNAL_ERROR", clientSessionId))
      );
      setPhase("error");
      return;
    }
    lastExecutionIdRef.current = executionId;

    const startedAt = performance.now();
    try {
      const output = await colorizeInBrowser(
        {
          fullRgba: prepared.fullRgba,
          width: prepared.width,
          height: prepared.height,
          smallRgba: prepared.smallRgba,
        },
        {
          signal: controller.signal,
          clientSessionId,
          finish: selectedFinish,
          onProgress: (p) => {
            if (runIdRef.current !== runId) return;
            setProgress(p);
            if (p.stage === "downloading_model" && !modelDownloadLoggedRef.current) {
              modelDownloadLoggedRef.current = true;
              sendEvent({ executionId, eventType: "model_download_started", status: "started" });
            } else if (p.stage === "initializing" && modelDownloadLoggedRef.current) {
              modelDownloadLoggedRef.current = false;
              sendEvent({ executionId, eventType: "model_download_completed", status: "completed" });
            }
          },
        }
      );
      if (runIdRef.current !== runId) return;

      const canvas = document.createElement("canvas");
      canvas.width = output.width;
      canvas.height = output.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ColorizeError("INTERNAL_ERROR", clientSessionId);
      const pixels = new Uint8ClampedArray(output.rgba.length);
      pixels.set(output.rgba);
      ctx.putImageData(new ImageData(pixels, output.width, output.height), 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );
      if (!blob) throw new ColorizeError("INTERNAL_ERROR", clientSessionId);
      if (runIdRef.current !== runId) return;

      const durationMs = Math.round(performance.now() - startedAt);
      lastResultMetaRef.current = { mode: output.backend, executionId };

      revokePreviewUrl(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setWarnings([...prepared.warnings, ...output.warnings]);
      setPhase("done");
      trackEvent("colorize_success", { backend: output.backend });

      // 完了ログはawaitしない（応答待ちで再試行が無反応になるのを避ける）
      sendEvent({
        executionId,
        eventType: "colorize_succeeded",
        status: "succeeded",
        processingMode: output.backend,
        imageWidth: prepared.width,
        imageHeight: prepared.height,
        outputWidth: output.width,
        outputHeight: output.height,
        durationMs,
      });
    } catch (err) {
      if (runIdRef.current !== runId) return;
      const colorizeErr =
        err instanceof ColorizeError ? err : new ColorizeError("INTERNAL_ERROR", clientSessionId, err);
      const durationMs = Math.round(performance.now() - startedAt);

      if (colorizeErr.errorCode === "PROCESS_CANCELLED") {
        setPhase("ready");
        setProgress(null);
        trackEvent("colorize_cancel");
        sendEvent({ executionId, eventType: "colorize_cancelled", status: "cancelled", durationMs });
        return;
      }

      setErrorDisplay(buildErrorDisplay(colorizeErr));
      setPhase("error");
      trackEvent("colorize_error", { code: colorizeErr.errorCode, clientSessionId });
      sendEvent({
        executionId,
        eventType: "colorize_failed",
        status: "failed",
        imageWidth: prepared?.width,
        imageHeight: prepared?.height,
        errorCode: colorizeErr.errorCode,
        durationMs,
      });
    } finally {
      inFlightRef.current = false;
      if (runIdRef.current === runId) abortRef.current = null;
    }
  }

  async function handleStart() {
    if (!consent) return;
    await runColorize(finish, null);
  }

  /** 結果画面での仕上がり切替（同じ画像で再実行）。 */
  async function handleFinishChange(next: ColorizeFinish) {
    if (next === finish || inFlightRef.current) return;
    setFinish(next);
    if (phase === "done") {
      await runColorize(next, lastExecutionIdRef.current);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  /**
   * 「同じ画像でもう一度試す」：状態を消してから**すぐに再実行**する。
   * 新しいexecutionId・新しいAbortControllerで実行される（retryOfに前回IDを付す）。
   */
  function handleRetrySameImage() {
    if (inFlightRef.current) return;
    trackEvent("colorize_retry", { mode: "same_image" });
    const retryOf = lastExecutionIdRef.current;
    revokePreviewUrl(resultUrl);
    setResultUrl(null);
    setWarnings([]);
    setErrorDisplay(null);
    setProgress(null);
    setPhase("ready");
    void runColorize(finish, retryOf);
  }

  function handleDownload() {
    if (!resultUrl) return;
    trackEvent("colorize_download");
    const executionId = lastResultMetaRef.current?.executionId ?? lastExecutionIdRef.current;
    if (executionId) {
      // 「ダウンロード完了」ではなく「ダウンロード操作を実行」として記録
      sendEvent({ executionId, eventType: "download_clicked", status: "clicked" });
    }
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = buildDownloadFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="colorize-tool">
      <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === "processing" && progressLabel(progress)}
        {phase === "done" && "カラー化が完了しました。"}
        {phase === "error" && errorDisplay && `${errorDisplay.heading} ${errorDisplay.message}`}
      </div>

      {phase === "select" && (
        <div
          className={`colorize-dropzone${dragActive ? " colorize-dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <label htmlFor="colorize-file-input" className="colorize-dropzone-label">
            <span className="colorize-dropzone-title">
              白黒写真をドラッグ＆ドロップ、またはタップして選択
            </span>
            <span className="colorize-dropzone-sub">対応形式：JPEG / PNG / WebP</span>
            <span className="colorize-dropzone-btn">画像を選ぶ</span>
          </label>
          <input
            id="colorize-file-input"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="colorize-file-input"
          />
          <p className="colorize-dropzone-privacy">
            この写真は端末内（お使いのブラウザの中）で処理されます。写真はSHIMA
            CRAFTや外部AIサービスへ送信されません。
          </p>
          {preparing && (
            <p className="colorize-preparing" role="status">画像を準備しています…</p>
          )}
          {selectError && (
            <p className="colorize-select-error" role="alert">{selectError}</p>
          )}
        </div>
      )}

      {phase === "ready" && prepared && (
        <div className="colorize-ready">
          <div className="colorize-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={prepared.previewUrl} alt="選択した白黒写真のプレビュー" />
            {prepared.resizedFrom && (
              <p className="colorize-resize-note">
                端末で安全に処理するため、{prepared.resizedFrom.width}×{prepared.resizedFrom.height}
                の元画像を{prepared.width}×{prepared.height}へ縮小して処理します。
              </p>
            )}
            <button type="button" className="colorize-remove-btn" onClick={handleRemoveImage}>
              画像を削除して選び直す
            </button>
          </div>

          <fieldset className="colorize-finish">
            <legend>仕上がりの色</legend>
            <label className="colorize-finish-option">
              <input type="radio" name="colorize-finish" checked={finish === "vivid"} onChange={() => setFinish("vivid")} />
              <span>
                あざやか（おすすめ）
                <small>デジタルカメラで撮ったような色乗りに調整します</small>
              </span>
            </label>
            <label className="colorize-finish-option">
              <input type="radio" name="colorize-finish" checked={finish === "soft"} onChange={() => setFinish("soft")} />
              <span>
                ひかえめ
                <small>AIの推定した控えめな色をそのまま使います</small>
              </span>
            </label>
          </fieldset>

          <div className="colorize-consent">
            <label className="colorize-consent-label">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="colorize-checkbox"
              />
              <span>
                自分が権利を持つ画像であること、色はAIによる推定であり元の色を正確に復元するものではないことを理解の上、
                <a href="/privacy" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
                に同意します。写真は端末内で処理され、SHIMA CRAFTへ送信されません。
              </span>
            </label>
          </div>

          <button
            type="button"
            className="btn colorize-start-btn"
            onClick={handleStart}
            disabled={!consent}
            aria-disabled={!consent}
          >
            カラー化を開始する
          </button>
          <p className="colorize-first-run-note">
            初回はカラー化モデル（約44〜69MB）の読み込みに時間がかかる場合があります。2回目以降はブラウザに保存されたモデルを使うため速くなります。
          </p>
        </div>
      )}

      {phase === "processing" && (
        <div className="colorize-processing" role="status">
          <span className="colorize-spinner" aria-hidden="true" />
          <p>{progressLabel(progress)}</p>
          <p className="colorize-processing-note">
            すべてお使いの端末内で処理しています。端末の性能により数秒〜1分ほどかかる場合があります。
          </p>
          <button type="button" className="btn btn-ghost colorize-btn-ghost" onClick={handleCancel}>
            キャンセル
          </button>
        </div>
      )}

      {phase === "done" && resultUrl && prepared && (
        <div className="colorize-result">
          <BeforeAfterSlider
            beforeSrc={prepared.previewUrl}
            afterSrc={resultUrl}
            width={prepared.width}
            height={prepared.height}
          />
          <div className="colorize-finish colorize-finish--result">
            <span>仕上がり：</span>
            <button
              type="button"
              className={`colorize-finish-toggle${finish === "vivid" ? " is-active" : ""}`}
              onClick={() => void handleFinishChange("vivid")}
            >
              あざやか
            </button>
            <button
              type="button"
              className={`colorize-finish-toggle${finish === "soft" ? " is-active" : ""}`}
              onClick={() => void handleFinishChange("soft")}
            >
              ひかえめ
            </button>
          </div>
          {warnings.includes("low_resolution") && (
            <p className="colorize-warning">
              ※ 元の画像の解像度が低いため、仕上がりの色にじみが目立つ場合があります。
            </p>
          )}
          {warnings.includes("structure_diff") && (
            <p className="colorize-warning">
              ※ 変換の過程で明るさがわずかに変化しています。気になる場合は元の画像も保存してください。
            </p>
          )}
          <p className="colorize-result-note">
            色はAIによる推定です。当時の実際の色を正確に復元するものではありません。結果画像はこの画面を離れると再表示できなくなるため、保存したい場合は先に保存してください。
          </p>
          <div className="colorize-result-actions">
            <button type="button" className="btn" onClick={handleDownload}>結果画像を保存する</button>
            <button type="button" className="btn btn-ghost colorize-btn-ghost" onClick={handleRetrySameImage}>
              同じ画像でもう一度試す
            </button>
            <button type="button" className="btn btn-ghost colorize-btn-ghost" onClick={handleRemoveImage}>
              別の画像で試す
            </button>
          </div>
        </div>
      )}

      {phase === "error" && errorDisplay && (
        <div className="colorize-error" role="alert">
          <h2 className="colorize-error-heading">{errorDisplay.heading}</h2>
          <p>{errorDisplay.message}</p>
          {errorDisplay.nextAction && <p>{errorDisplay.nextAction}</p>}
          <p className="colorize-error-meta">
            エラーコード: {errorDisplay.errorCode}
            {errorDisplay.clientSessionId && ` / セッションID: ${errorDisplay.clientSessionId}`}
          </p>
          <div className="colorize-result-actions">
            {errorDisplay.retryable && (
              <button type="button" className="btn" onClick={handleRetrySameImage}>
                同じ画像でもう一度試す
              </button>
            )}
            <button type="button" className="btn btn-ghost colorize-btn-ghost" onClick={handleRemoveImage}>
              {errorDisplay.suggestDifferentImage ? "別の画像で試す" : "はじめからやり直す"}
            </button>
          </div>
          {!errorDisplay.retryable && (
            <p style={{ marginTop: 10, fontSize: "0.85rem" }}>
              解決しない場合は <a href={contactHref}>SHIMA CRAFTへお問い合わせ</a> ください。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
