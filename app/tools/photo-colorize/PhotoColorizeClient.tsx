"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/app/components/TrackedLink";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { TurnstileWidget } from "./TurnstileWidget";
import {
  ImageProcessingError,
  buildDownloadFilename,
  prepareImageForUpload,
  revokePreviewUrl,
  type PreparedImage,
} from "./imageProcessing";
import {
  COLORIZE_ERROR_HEADINGS,
  COLORIZE_ERROR_IS_CONFIG_ISSUE,
  type ColorizeApiResponse,
  type ColorizeErrorCode,
} from "@/lib/colorization/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Phase = "select" | "ready" | "processing" | "done" | "error";

type Props = {
  turnstileSiteKey: string;
  toolEnabled: boolean;
};

type ErrorDisplay = {
  heading: string;
  message: string;
  errorCode: string;
  retryable: boolean;
  requestId: string | null;
  /** trueの場合のみ「別の画像で試す」を表示する。設定不備等の場合は画像を疑わせない。 */
  suggestDifferentImage: boolean;
};

function buildErrorDisplay(errorCode: ColorizeErrorCode, userMessage: string, retryable: boolean, requestId: string): ErrorDisplay {
  return {
    heading: COLORIZE_ERROR_HEADINGS[errorCode] ?? "エラーが発生しました",
    message: userMessage,
    errorCode,
    retryable,
    requestId,
    suggestDifferentImage: !COLORIZE_ERROR_IS_CONFIG_ISSUE[errorCode],
  };
}

function buildNetworkErrorDisplay(): ErrorDisplay {
  return {
    heading: "通信エラーが発生しました",
    message: "ネットワークエラーが発生しました。接続を確認して再度お試しください。",
    errorCode: "NETWORK_ERROR",
    retryable: true,
    requestId: null,
    suggestDifferentImage: true,
  };
}

export function PhotoColorizeClient({ turnstileSiteKey, toolEnabled }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorDisplay, setErrorDisplay] = useState<ErrorDisplay | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => revokePreviewUrl(prepared?.previewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAll = useCallback(() => {
    revokePreviewUrl(prepared?.previewUrl);
    setPrepared(null);
    setPreparing(false);
    setSelectError(null);
    setConsent(false);
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
    setSubmitting(false);
    setResultUrl(null);
    setWarnings([]);
    setErrorDisplay(null);
    setPhase("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [prepared]);

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
        const result = await prepareImageForUpload(file);
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
    if (!prepared || !consent || !turnstileToken || submitting) return;
    setSubmitting(true);
    setPhase("processing");
    setErrorDisplay(null);
    trackEvent("colorize_start");

    try {
      const formData = new FormData();
      formData.set("image", prepared.blob, "upload.jpg");
      formData.set("consent", "true");
      formData.set("turnstileToken", turnstileToken);

      const res = await fetch("/api/tools/photo-colorize", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => null)) as ColorizeApiResponse | null;

      if (res.ok && data && data.success) {
        setResultUrl(data.resultUrl);
        setWarnings(data.warnings);
        setPhase("done");
        trackEvent("colorize_success");
      } else if (data && !data.success) {
        setErrorDisplay(buildErrorDisplay(data.errorCode, data.userMessage, data.retryable, data.requestId));
        setPhase("error");
        trackEvent("colorize_error", { code: data.errorCode, requestId: data.requestId });
      } else {
        setErrorDisplay(buildNetworkErrorDisplay());
        setPhase("error");
        trackEvent("colorize_error", { code: "NETWORK_ERROR" });
      }
    } catch {
      setErrorDisplay(buildNetworkErrorDisplay());
      setPhase("error");
      trackEvent("colorize_error", { code: "NETWORK_ERROR" });
    } finally {
      setSubmitting(false);
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    }
  }

  function handleRetrySameImage() {
    trackEvent("colorize_retry", { mode: "same_image" });
    setResultUrl(null);
    setWarnings([]);
    setErrorDisplay(null);
    setConsent(false);
    setTurnstileToken(null);
    setTurnstileKey((k) => k + 1);
    setPhase("ready");
  }

  async function handleDownload() {
    if (!resultUrl) return;
    trackEvent("colorize_download");
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = buildDownloadFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setErrorDisplay({
        heading: "保存に失敗しました",
        message: "保存用の画像を取得できませんでした。画像を右クリック（長押し）して保存してください。",
        errorCode: "DOWNLOAD_FAILED",
        retryable: false,
        requestId: null,
        suggestDifferentImage: false,
      });
    }
  }

  if (!toolEnabled) {
    return (
      <div className="colorize-tool colorize-tool--disabled" role="status">
        <p>
          現在この機能は準備中のため、ご利用いただけません。しばらくしてから再度お試しください。
        </p>
      </div>
    );
  }

  return (
    <div className="colorize-tool">
      <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === "processing" && "AIが色を推定しています。しばらくお待ちください。"}
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
            <img src={prepared.previewUrl} alt="アップロードした白黒写真のプレビュー" />
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
                自分が権利を持つ画像であること、色はAIによる推定であり元の色を正確に復元するものではないこと、アップロードした画像をSHIMA
                CRAFTが学習・広告・事例へ無断利用しないことを理解の上、
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  プライバシーポリシー
                </a>
                に同意します。
              </span>
            </label>
          </div>

          {turnstileSiteKey && (
            <TurnstileWidget key={turnstileKey} siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
          )}

          <button
            type="button"
            className="btn colorize-start-btn"
            onClick={handleStart}
            disabled={!consent || !turnstileToken || submitting}
            aria-disabled={!consent || !turnstileToken || submitting}
          >
            カラー化を開始する
          </button>
        </div>
      )}

      {phase === "processing" && (
        <div className="colorize-processing" role="status">
          <span className="colorize-spinner" aria-hidden="true" />
          <p>AIが色を推定しています…</p>
          <p className="colorize-processing-note">
            画像の内容により、最大1分ほどかかる場合があります。処理中はこのページを離れずにお待ちください。
          </p>
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
          <p className="colorize-result-note">
            色はAIによる推定です。当時の実際の色を正確に復元するものではありません。結果画像はこの画面を離れると再表示できない場合がありますので、保存したい場合は先に保存してください。
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
          <p className="colorize-error-meta">
            エラーコード: {errorDisplay.errorCode}
            {errorDisplay.requestId && ` / お問い合わせ番号: ${errorDisplay.requestId}`}
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
