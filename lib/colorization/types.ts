/**
 * 白黒写真カラー化機能の共有型定義。
 * サーバー専用の値（APIキー等）は一切含まないため、クライアント側からも安全に import できる。
 */

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

export type ColorizeErrorCode =
  | "INVALID_FILE"
  | "UNSUPPORTED_TYPE"
  | "FILE_TOO_LARGE"
  | "IMAGE_DECODE_FAILED"
  | "CONSENT_REQUIRED"
  | "TURNSTILE_FAILED"
  | "RATE_LIMITED"
  | "SERVICE_DISABLED"
  | "MODEL_TIMEOUT"
  | "MODEL_FAILED"
  | "INTERNAL_ERROR";

/** 利用者向け日本語メッセージ。外部APIのレスポンス全文や秘密情報は含めない。 */
export const COLORIZE_ERROR_MESSAGES: Record<ColorizeErrorCode, string> = {
  INVALID_FILE: "画像を読み込めませんでした。別の画像を選んでください。",
  UNSUPPORTED_TYPE: "JPEG・PNG・WebPの画像を選択してください。",
  FILE_TOO_LARGE: "画像が大きすぎます。別の画像を選ぶか、縮小してからお試しください。",
  IMAGE_DECODE_FAILED: "画像の読み込みに失敗しました。ファイルが壊れていないかご確認ください。",
  CONSENT_REQUIRED: "権利保有・AI推定色に関する確認へのご同意が必要です。",
  TURNSTILE_FAILED: "確認に失敗しました。ページを再読み込みしてからお試しください。",
  RATE_LIMITED: "本日の無料利用上限に達しました。日付が変わってから再度お試しください。",
  SERVICE_DISABLED: "現在この機能はご利用いただけません。しばらくしてから再度お試しください。",
  MODEL_TIMEOUT: "処理に時間がかかりすぎました。もう一度お試しください。",
  MODEL_FAILED: "カラー化に失敗しました。別の画像でもお試しください。",
  INTERNAL_ERROR: "一時的なエラーが発生しました。時間をおいて再度お試しください。",
};

export const COLORIZE_ERROR_HTTP_STATUS: Record<ColorizeErrorCode, number> = {
  INVALID_FILE: 400,
  UNSUPPORTED_TYPE: 400,
  FILE_TOO_LARGE: 413,
  IMAGE_DECODE_FAILED: 400,
  CONSENT_REQUIRED: 400,
  TURNSTILE_FAILED: 403,
  RATE_LIMITED: 429,
  SERVICE_DISABLED: 503,
  MODEL_TIMEOUT: 504,
  MODEL_FAILED: 502,
  INTERNAL_ERROR: 500,
};

export type ColorizeApiSuccess = {
  success: true;
  resultUrl: string;
  model: string;
  warnings: string[];
};

export type ColorizeApiFailure = {
  success: false;
  code: ColorizeErrorCode;
  message: string;
};

export type ColorizeApiResponse = ColorizeApiSuccess | ColorizeApiFailure;

export type ColorizeProviderInput = {
  imageBuffer: Buffer;
  mimeType: SupportedImageType;
};

export type ColorizeProviderResult =
  | { ok: true; resultUrl: string; model: string; version: string }
  | { ok: false; code: ColorizeErrorCode };

export interface ColorizationProvider {
  colorize(
    input: ColorizeProviderInput,
    options: { signal: AbortSignal }
  ): Promise<ColorizeProviderResult>;
}
