"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

/** ページ側（サーバー）で判定した利用モード。認可の根拠はサーバー/DB側にある。 */
export type ColorizeAccessMode = "member" | "trial" | "blocked";

type Props = {
  toolEnabled: boolean;
  accessMode: ColorizeAccessMode;
  /** trialモード時の残り回数（サーバー算出の初期値）。 */
  trialRemaining?: number;
  trialLimit?: number;
  /** blockedモード時に表示するメッセージ。 */
  blockedMessage?: string;
  /** 問い合わせ用mailtoリンク。 */
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

/** 会員の利用ログをサーバーへ送る（fire-and-forget。画像データは含まない）。 */
function sendMemberLog(payload: Record<string, unknown>): void {
  try {
    void fetch("/api/colorize-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // ログ失敗は利用を妨げない
  }
}

async function sendTrialComplete(
  ticket: string,
  result: "succeeded" | "failed" | "cancelled",
  meta: { processing_mode?: string; duration_ms?: number; error_code?: string }
): Promise<number | null> {
  try {
    const res = await fetch("/api/trial/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, result, ...meta }),
      keepalive: true,
    });
    const data = (await res.json().catch(() => null)) as { remaining?: number } | null;
    return typeof data?.remaining === "number" ? data.remaining : null;
  } catch {
    return null;
  }
}

export function PhotoColorizeClient({
  toolEnabled,
  accessMode,
  trialRemaining = 0,
  trialLimit = 3,
  blockedMessage,
  contactHref,
}: Props) {
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
  const [remaining, setRemaining] = useState(trialRemaining);
  const [trialExhausted, setTrialExhausted] = useState(accessMode === "trial" && trialRemaining <= 0);
  const [trialNotice, setTrialNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  /** 実行中の多重起動防止（stateのphaseはクロージャで古くなるためrefで判定する） */
  const inFlightRef = useRef(false);
  const modelDownloadLoggedRef = useRef(false);
  const lastResultMetaRef = useRef<{ mode?: string; durationMs?: number } | null>(null);

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

  async function runColorize(selectedFinish: ColorizeFinish) {
    if (!prepared || inFlightRef.current) return;
    inFlightRef.current = true;
    // 実行のたびに新しいAbortController・実行ID（クライアントセッションID）を作る
    const controller = new AbortController();
    abortRef.current = controller;
    const runId = ++runIdRef.current;
    const clientSessionId = newClientSessionId();
    modelDownloadLoggedRef.current = false;

    // お試しモードはサーバーの残回数確認とチケット発行が必須
    let trialTicket: string | null = null;
    if (accessMode === "trial") {
      setPhase("processing");
      setProgress(null);
      try {
        const res = await fetch("/api/trial/start", { method: "POST" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          ticket?: string;
          remaining?: number;
          userMessage?: string;
        } | null;
        if (!res.ok || !data?.ok || !data.ticket) {
          setPhase("ready");
          setTrialExhausted(true);
          setTrialNotice(
            data?.userMessage ??
              "無料お試しのご利用回数が上限に達しました。引き続きご利用いただくには会員登録の申請をお願いいたします。"
          );
          trackEvent("colorize_trial_exhausted");
          return;
        }
        trialTicket = data.ticket;
        if (typeof data.remaining === "number") setRemaining(data.remaining);
      } catch {
        setPhase("ready");
        setTrialNotice("通信エラーが発生しました。接続を確認して再度お試しください。");
        return;
      }
    }

    setPhase("processing");
    setProgress(null);
    setErrorDisplay(null);
    trackEvent("colorize_start");
    if (accessMode === "member") {
      sendMemberLog({
        event_type: "colorize_started",
        status: "started",
        image_width: prepared.width,
        image_height: prepared.height,
        input_file_size: prepared.sourceFileSize,
      });
    }

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
            if (accessMode === "member") {
              if (p.stage === "downloading_model" && !modelDownloadLoggedRef.current) {
                modelDownloadLoggedRef.current = true;
                sendMemberLog({ event_type: "model_download_started", status: "started" });
              } else if (p.stage === "initializing" && modelDownloadLoggedRef.current) {
                modelDownloadLoggedRef.current = false;
                sendMemberLog({ event_type: "model_download_completed", status: "completed" });
              }
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
      lastResultMetaRef.current = { mode: output.backend, durationMs };

      revokePreviewUrl(resultUrl);
      setResultUrl(URL.createObjectURL(blob));
      setWarnings([...prepared.warnings, ...output.warnings]);
      setPhase("done");
      trackEvent("colorize_success", {
        backend: output.backend,
        inferMs: Math.round(output.timings.inferMs),
        modelDownloadMs: Math.round(output.timings.modelDownloadMs),
      });

      if (accessMode === "member") {
        sendMemberLog({
          event_type: "colorize_succeeded",
          status: "succeeded",
          image_width: prepared.width,
          image_height: prepared.height,
          input_file_size: prepared.sourceFileSize,
          output_width: output.width,
          output_height: output.height,
          processing_mode: output.backend,
          duration_ms: durationMs,
        });
      } else if (trialTicket) {
        // 完了報告はawaitしない（応答待ちの間 inFlightRef が立ったままになり、
        // 「同じ画像でもう一度試す」が無反応になる不具合の原因だったため）。
        // 残回数の最終判定は次回の /api/trial/start がサーバー側で行う。
        void sendTrialComplete(trialTicket, "succeeded", {
          processing_mode: output.backend,
          duration_ms: durationMs,
        }).then((newRemaining) => {
          if (newRemaining !== null) {
            setRemaining(newRemaining);
            if (newRemaining <= 0) {
              setTrialExhausted(true);
              setTrialNotice(null);
            }
          }
        });
      }
    } catch (err) {
      if (runIdRef.current !== runId) return;
      const colorizeErr =
        err instanceof ColorizeError ? err : new ColorizeError("INTERNAL_ERROR", clientSessionId, err);
      const durationMs = Math.round(performance.now() - startedAt);

      if (colorizeErr.errorCode === "PROCESS_CANCELLED") {
        setPhase("ready");
        setProgress(null);
        trackEvent("colorize_cancel");
        if (accessMode === "member") {
          sendMemberLog({ event_type: "colorize_cancelled", status: "cancelled", duration_ms: durationMs });
        } else if (trialTicket) {
          void sendTrialComplete(trialTicket, "cancelled", { duration_ms: durationMs });
        }
        return;
      }

      setErrorDisplay(buildErrorDisplay(colorizeErr));
      setPhase("error");
      trackEvent("colorize_error", { code: colorizeErr.errorCode, clientSessionId });
      if (accessMode === "member") {
        sendMemberLog({
          event_type: "colorize_failed",
          status: "failed",
          image_width: prepared?.width,
          image_height: prepared?.height,
          error_code: colorizeErr.errorCode,
          duration_ms: durationMs,
        });
      } else if (trialTicket) {
        // 失敗は回数を消費しない
        void sendTrialComplete(trialTicket, "failed", {
          duration_ms: durationMs,
          error_code: colorizeErr.errorCode,
        });
      }
    } finally {
      inFlightRef.current = false;
      if (runIdRef.current === runId) abortRef.current = null;
    }
  }

  async function handleStart() {
    if (!consent) return;
    await runColorize(finish);
  }

  /** 結果画面での仕上がり切替（推論はセッション再利用で高速に再実行される）。 */
  async function handleFinishChange(next: ColorizeFinish) {
    if (next === finish || inFlightRef.current) return;
    setFinish(next);
    if (phase === "done") {
      await runColorize(next);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  /**
   * 「同じ画像でもう一度試す」：状態を消してから**すぐに再実行**する。
   * ready画面へ戻すだけだと「押しても何も起きない」ように見えるため、
   * 直接カラー化を開始する（同意は取得済み・入力画像は保持している）。
   */
  function handleRetrySameImage() {
    if (inFlightRef.current) return;
    trackEvent("colorize_retry", { mode: "same_image" });
    revokePreviewUrl(resultUrl);
    setResultUrl(null);
    setWarnings([]);
    setErrorDisplay(null);
    setProgress(null);
    setPhase("ready");
    void runColorize(finish);
  }

  function handleDownload() {
    if (!resultUrl) return;
    trackEvent("colorize_download");
    if (accessMode === "member") {
      sendMemberLog({
        event_type: "download_clicked",
        status: "clicked",
        processing_mode: lastResultMetaRef.current?.mode,
      });
    }
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
        <p>現在、提供を一時停止しています。しばらくしてから再度お試しください。</p>
      </div>
    );
  }

  if (accessMode === "blocked") {
    return (
      <div className="colorize-tool colorize-tool--disabled" role="status">
        <p>{blockedMessage ?? "現在、このアカウントではカラー化サービスをご利用いただけません。"}</p>
        <p>
          <a href={contactHref} className="btn">
            SHIMA CRAFTへ問い合わせる
          </a>
        </p>
      </div>
    );
  }

  const trialBlocked = accessMode === "trial" && trialExhausted;

  return (
    <div className="colorize-tool">
      <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === "processing" && progressLabel(progress)}
        {phase === "done" && "カラー化が完了しました。"}
        {phase === "error" && errorDisplay && `${errorDisplay.heading} ${errorDisplay.message}`}
      </div>

      {accessMode === "trial" && (
        <div className="colorize-trial-bar" role="status">
          {trialBlocked ? (
            <p>
              無料お試し（{trialLimit}回）はすべてご利用いただきました。引き続きご利用いただくには、会員登録の申請をお願いいたします。
            </p>
          ) : (
            <p>
              お試し利用中：残り <strong>{remaining}</strong> 回（全{trialLimit}
              回・成功した生成のみカウント）。継続してご利用いただくには会員登録が必要です。
            </p>
          )}
          <div className="colorize-trial-actions">
            <a href={contactHref} className="btn colorize-trial-btn">
              会員登録・料金について問い合わせる
            </a>
            <Link href="/login?next=/tools/photo-colorize" className="btn btn-ghost colorize-btn-ghost">
              会員の方はログイン
            </Link>
          </div>
          {trialNotice && !trialBlocked && (
            <p className="colorize-select-error" role="alert">
              {trialNotice}
            </p>
          )}
        </div>
      )}

      {trialBlocked ? null : (
        <>
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

              <fieldset className="colorize-finish">
                <legend>仕上がりの色</legend>
                <label className="colorize-finish-option">
                  <input
                    type="radio"
                    name="colorize-finish"
                    checked={finish === "vivid"}
                    onChange={() => setFinish("vivid")}
                  />
                  <span>
                    あざやか（おすすめ）
                    <small>デジタルカメラで撮ったような色乗りに調整します</small>
                  </span>
                </label>
                <label className="colorize-finish-option">
                  <input
                    type="radio"
                    name="colorize-finish"
                    checked={finish === "soft"}
                    onChange={() => setFinish("soft")}
                  />
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
        </>
      )}
    </div>
  );
}
