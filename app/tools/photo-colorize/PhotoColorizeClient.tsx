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
  toolEnabled: boolean;
};

type ErrorDisplay = {
  heading: string;
  message: string;
  errorCode: string;
  retryable: boolean;
  clientSessionId: string | null;
  nextAction: string | null;
  /** trueの場合のみ「別の画像で試す」を表示する。端末・通信起因の場合は画像を疑わせない。 */
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

export function PhotoColorizeClient({ toolEnabled }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<ColorizeProgress | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorDisplay, setErrorDisplay] = useState<ErrorDisplay | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

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

  async function handleStart() {
    if (!prepared || !consent || phase === "processing") return;
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = ++runIdRef.current;
    const clientSessionId = newClientSessionId();

    setPhase("processing");
    setProgress(null);
    setErrorDisplay(null);
    trackEvent("colorize_start");

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
          onProgress: (p) => {
            if (runIdRef.current === runId) setProgress(p);
          },
        }
      );
      if (runIdRef.current !== runId) return; // キャンセル・リセット後に完了した結果は捨てる

      // 結果を JPEG の object URL にする（画像はブラウザ内のみ・保存もローカル）
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

      revokePreviewUrl(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setWarnings([...prepared.warnings, ...output.warnings]);
      setPhase("done");
      trackEvent("colorize_success", {
        backend: output.backend,
        inferMs: Math.round(output.timings.inferMs),
        modelDownloadMs: Math.round(output.timings.modelDownloadMs),
      });
    } catch (err) {
      if (runIdRef.current !== runId) return;
      const colorizeErr =
        err instanceof ColorizeError ? err : new ColorizeError("INTERNAL_ERROR", clientSessionId, err);
      if (colorizeErr.errorCode === "PROCESS_CANCELLED") {
        setPhase("ready");
        setProgress(null);
        trackEvent("colorize_cancel");
        return;
      }
      setErrorDisplay(buildErrorDisplay(colorizeErr));
      setPhase("error");
      trackEvent("colorize_error", { code: colorizeErr.errorCode, clientSessionId });
    } finally {
      if (runIdRef.current === runId) abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleRetrySameImage() {
    trackEvent("colorize_retry", { mode: "same_image" });
    revokePreviewUrl(resultUrl);
    setResultUrl(null);
    setWarnings([]);
    setErrorDisplay(null);
    setProgress(null);
    setPhase("ready");
  }

  function handleDownload() {
    if (!resultUrl) return;
    trackEvent("colorize_download");
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = buildDownloadFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (!toolEnabled) {
    return (
      <div className="colorize-tool colorize-tool--disabled" role="status">
        <p>現在、試験提供を一時停止しています。しばらくしてから再度お試しください。</p>
      </div>
    );
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
            <p className="colorize-preparing" role="status">
              画像を準備しています…
            </p>
          )}
          {selectError && (
            <p className="colorize-select-error" role="alert">
              {selectError}
            </p>
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
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  プライバシーポリシー
                </a>
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
            <button type="button" className="btn" onClick={handleDownload}>
              結果画像を保存する
            </button>
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
        </div>
      )}
    </div>
  );
}
