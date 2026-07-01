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
  | "REPLICATE_AUTH_FAILED"
  | "REPLICATE_BILLING_REQUIRED"
  | "MODEL_VERSION_INVALID"
  | "MODEL_EXECUTION_FAILED"
  | "MODEL_TIMEOUT"
  | "INTERNAL_ERROR";

/** エラー画面の見出し。原因ごとに何が起きたか一目で分かる短い文言。 */
export const COLORIZE_ERROR_HEADINGS: Record<ColorizeErrorCode, string> = {
  INVALID_FILE: "画像を読み込めませんでした",
  UNSUPPORTED_TYPE: "対応していない画像形式です",
  FILE_TOO_LARGE: "画像サイズが大きすぎます",
  IMAGE_DECODE_FAILED: "画像を確認できませんでした",
  CONSENT_REQUIRED: "同意が必要です",
  TURNSTILE_FAILED: "確認に失敗しました",
  RATE_LIMITED: "本日の利用上限に達しました",
  SERVICE_DISABLED: "現在ご利用いただけません",
  REPLICATE_AUTH_FAILED: "サービス設定に問題があります",
  REPLICATE_BILLING_REQUIRED: "サービス側の準備が完了していません",
  MODEL_VERSION_INVALID: "サービス設定に問題があります",
  MODEL_EXECUTION_FAILED: "カラー化に失敗しました",
  MODEL_TIMEOUT: "処理がタイムアウトしました",
  INTERNAL_ERROR: "一時的なエラーが発生しました",
};

/**
 * 利用者向け日本語メッセージ。外部APIのレスポンス全文や秘密情報は含めない。
 * 「別の画像でもお試しください」のような、原因に関わらず画像のせいであるかのような
 * 誤解を招く固定文言は使わない。画像に起因しない失敗（設定不備・課金未設定・
 * レート制限・確認失敗等）では画像を疑わせる表現をしない。
 */
export const COLORIZE_ERROR_MESSAGES: Record<ColorizeErrorCode, string> = {
  INVALID_FILE: "画像を読み込めませんでした。ファイル形式をご確認のうえ、別の画像を選び直してください。",
  UNSUPPORTED_TYPE: "JPEG・PNG・WebP形式の画像のみご利用いただけます。別の画像を選び直してください。",
  FILE_TOO_LARGE: "画像のファイルサイズが上限を超えています。サイズを小さくするか、別の画像でお試しください。",
  IMAGE_DECODE_FAILED: "画像データを読み取れませんでした。ファイルが破損していないかご確認のうえ、別の画像でお試しください。",
  CONSENT_REQUIRED: "権利保有・AI推定色に関する確認へのご同意をいただけていません。内容をご確認のうえ、チェックしてからもう一度お試しください。",
  TURNSTILE_FAILED: "ボット確認に失敗しました。ページの状態が古くなっている可能性があります。もう一度確認を行ってからお試しください。",
  RATE_LIMITED: "本日ご利用いただける無料回数の上限に達しました。日付が変わってから再度お試しください。",
  SERVICE_DISABLED: "現在この機能は一時的に停止しています。しばらく時間をおいてから再度お試しください。",
  REPLICATE_AUTH_FAILED: "サービス側の設定に問題が発生しており、現在この機能をご利用いただけません。しばらくしてから再度お試しください。",
  REPLICATE_BILLING_REQUIRED: "サービス側の準備が完了していないため、現在この機能をご利用いただけません。しばらくしてから再度お試しください。",
  MODEL_VERSION_INVALID: "サービス側の設定に問題が発生しており、現在この機能をご利用いただけません。しばらくしてから再度お試しください。",
  MODEL_EXECUTION_FAILED: "カラー化処理中にエラーが発生しました。もう一度お試しいただくか、別の画像でお試しください。",
  MODEL_TIMEOUT: "処理に時間がかかりすぎたため中断しました。もう一度お試しください。",
  INTERNAL_ERROR: "一時的なエラーが発生しました。しばらく時間をおいてから再度お試しください。",
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
  REPLICATE_AUTH_FAILED: 502,
  REPLICATE_BILLING_REQUIRED: 502,
  MODEL_VERSION_INVALID: 502,
  MODEL_EXECUTION_FAILED: 502,
  MODEL_TIMEOUT: 504,
  INTERNAL_ERROR: 500,
};

/**
 * 「同じ画像でもう一度試す」ボタンを出してよいか。
 * 画像そのものに起因する失敗や、運用側の設定・課金の問題は再試行しても
 * 結果が変わらないため false。確認・タイムアウト・一時的な実行失敗など、
 * やり直せば成功しうるものだけ true。
 */
export const COLORIZE_ERROR_RETRYABLE: Record<ColorizeErrorCode, boolean> = {
  INVALID_FILE: false,
  UNSUPPORTED_TYPE: false,
  FILE_TOO_LARGE: false,
  IMAGE_DECODE_FAILED: false,
  CONSENT_REQUIRED: true,
  TURNSTILE_FAILED: true,
  RATE_LIMITED: false,
  SERVICE_DISABLED: false,
  REPLICATE_AUTH_FAILED: false,
  REPLICATE_BILLING_REQUIRED: false,
  MODEL_VERSION_INVALID: false,
  MODEL_EXECUTION_FAILED: true,
  MODEL_TIMEOUT: true,
  INTERNAL_ERROR: true,
};

/**
 * 運用側の設定不備・課金未設定に起因するエラーかどうか。
 * true の場合、画面上で「別の画像で試す」のような画像を疑わせる導線は出さない。
 */
export const COLORIZE_ERROR_IS_CONFIG_ISSUE: Record<ColorizeErrorCode, boolean> = {
  INVALID_FILE: false,
  UNSUPPORTED_TYPE: false,
  FILE_TOO_LARGE: false,
  IMAGE_DECODE_FAILED: false,
  CONSENT_REQUIRED: false,
  TURNSTILE_FAILED: false,
  RATE_LIMITED: false,
  SERVICE_DISABLED: true,
  REPLICATE_AUTH_FAILED: true,
  REPLICATE_BILLING_REQUIRED: true,
  MODEL_VERSION_INVALID: true,
  MODEL_EXECUTION_FAILED: false,
  MODEL_TIMEOUT: false,
  INTERNAL_ERROR: false,
};

export type ColorizeApiSuccess = {
  success: true;
  resultUrl: string;
  model: string;
  warnings: string[];
  requestId: string;
};

export type ColorizeApiFailure = {
  success: false;
  errorCode: ColorizeErrorCode;
  userMessage: string;
  retryable: boolean;
  requestId: string;
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
    options: { signal: AbortSignal; requestId: string }
  ): Promise<ColorizeProviderResult>;
}
