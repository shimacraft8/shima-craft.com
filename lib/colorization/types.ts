/**
 * 白黒写真カラー化機能の共有型定義。
 * 処理は全てブラウザ内で完結する（外部AI API・サーバーアップロードなし）。
 * サーバー専用の値は一切含まないため、クライアント側からも安全に import できる。
 */

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

export type ColorizeErrorCode =
  | "INVALID_FILE"
  | "UNSUPPORTED_TYPE"
  | "IMAGE_DECODE_FAILED"
  | "MODEL_DOWNLOAD_FAILED"
  | "WEBGPU_UNAVAILABLE"
  | "WASM_INITIALIZATION_FAILED"
  | "MODEL_INITIALIZATION_FAILED"
  | "IMAGE_TOO_LARGE_FOR_DEVICE"
  | "OUT_OF_MEMORY"
  | "COLORIZATION_FAILED"
  | "PROCESS_CANCELLED"
  | "UNSUPPORTED_BROWSER"
  | "INTERNAL_ERROR";

/** エラー画面の見出し。原因ごとに何が起きたか一目で分かる短い文言。 */
export const COLORIZE_ERROR_HEADINGS: Record<ColorizeErrorCode, string> = {
  INVALID_FILE: "画像を読み込めませんでした",
  UNSUPPORTED_TYPE: "対応していない画像形式です",
  IMAGE_DECODE_FAILED: "画像を確認できませんでした",
  MODEL_DOWNLOAD_FAILED: "カラー化モデルを読み込めませんでした",
  WEBGPU_UNAVAILABLE: "この端末ではGPU処理を利用できません",
  WASM_INITIALIZATION_FAILED: "処理エンジンを起動できませんでした",
  MODEL_INITIALIZATION_FAILED: "カラー化モデルを準備できませんでした",
  IMAGE_TOO_LARGE_FOR_DEVICE: "この端末には画像が大きすぎます",
  OUT_OF_MEMORY: "端末のメモリが不足しています",
  COLORIZATION_FAILED: "カラー化に失敗しました",
  PROCESS_CANCELLED: "処理をキャンセルしました",
  UNSUPPORTED_BROWSER: "お使いのブラウザではご利用いただけません",
  INTERNAL_ERROR: "一時的なエラーが発生しました",
};

/**
 * 利用者向け日本語メッセージ。技術的な内部情報は含めない。
 * 画像に起因しない失敗では、画像のせいであるかのような誤解を招く文言を使わない。
 */
export const COLORIZE_ERROR_MESSAGES: Record<ColorizeErrorCode, string> = {
  INVALID_FILE:
    "画像を読み込めませんでした。ファイル形式をご確認のうえ、別の画像を選び直してください。",
  UNSUPPORTED_TYPE:
    "JPEG・PNG・WebP形式の画像のみご利用いただけます。別の画像を選び直してください。",
  IMAGE_DECODE_FAILED:
    "画像データを読み取れませんでした。ファイルが破損していないかご確認のうえ、別の画像でお試しください。",
  MODEL_DOWNLOAD_FAILED:
    "カラー化モデルのダウンロードに失敗しました。通信環境をご確認のうえ、もう一度お試しください。",
  WEBGPU_UNAVAILABLE:
    "この端末ではGPUを使った高速処理を利用できないため、少し時間のかかる方式で処理します。もう一度お試しください。",
  WASM_INITIALIZATION_FAILED:
    "ブラウザ内の処理エンジンを起動できませんでした。ブラウザを最新版に更新してからもう一度お試しください。",
  MODEL_INITIALIZATION_FAILED:
    "カラー化モデルの準備中にエラーが発生しました。ページを再読み込みしてからもう一度お試しください。",
  IMAGE_TOO_LARGE_FOR_DEVICE:
    "この端末で処理するには画像が大きすぎます。より小さな画像でお試しください。",
  OUT_OF_MEMORY:
    "処理中に端末のメモリが不足しました。他のタブやアプリを閉じるか、より小さな画像でお試しください。",
  COLORIZATION_FAILED:
    "カラー化処理中にエラーが発生しました。もう一度お試しいただくか、別の画像でお試しください。",
  PROCESS_CANCELLED: "処理をキャンセルしました。もう一度実行できます。",
  UNSUPPORTED_BROWSER:
    "お使いのブラウザはブラウザ内AI処理に対応していません。Chrome・Edge・Safariの最新版でお試しください。",
  INTERNAL_ERROR:
    "一時的なエラーが発生しました。ページを再読み込みしてからもう一度お試しください。",
};

/**
 * 「同じ画像でもう一度試す」を出してよいか。
 * やり直せば成功しうるものだけ true。端末・ブラウザの能力に起因するものは false。
 */
export const COLORIZE_ERROR_RETRYABLE: Record<ColorizeErrorCode, boolean> = {
  INVALID_FILE: false,
  UNSUPPORTED_TYPE: false,
  IMAGE_DECODE_FAILED: false,
  MODEL_DOWNLOAD_FAILED: true,
  WEBGPU_UNAVAILABLE: true,
  WASM_INITIALIZATION_FAILED: false,
  MODEL_INITIALIZATION_FAILED: true,
  IMAGE_TOO_LARGE_FOR_DEVICE: false,
  OUT_OF_MEMORY: true,
  COLORIZATION_FAILED: true,
  PROCESS_CANCELLED: true,
  UNSUPPORTED_BROWSER: false,
  INTERNAL_ERROR: true,
};

/**
 * 端末・ブラウザ・通信など、画像そのもの以外に起因するエラーかどうか。
 * true の場合、「別の画像で試す」のような画像を疑わせる導線は出さない。
 */
export const COLORIZE_ERROR_IS_ENVIRONMENT_ISSUE: Record<ColorizeErrorCode, boolean> = {
  INVALID_FILE: false,
  UNSUPPORTED_TYPE: false,
  IMAGE_DECODE_FAILED: false,
  MODEL_DOWNLOAD_FAILED: true,
  WEBGPU_UNAVAILABLE: true,
  WASM_INITIALIZATION_FAILED: true,
  MODEL_INITIALIZATION_FAILED: true,
  IMAGE_TOO_LARGE_FOR_DEVICE: false,
  OUT_OF_MEMORY: false,
  COLORIZATION_FAILED: false,
  PROCESS_CANCELLED: false,
  UNSUPPORTED_BROWSER: true,
  INTERNAL_ERROR: true,
};

/** 利用者がエラー後に取るべき行動（画面のエラー詳細に表示する）。 */
export const COLORIZE_ERROR_NEXT_ACTIONS: Record<ColorizeErrorCode, string> = {
  INVALID_FILE: "JPEG・PNG・WebPの画像を選び直してください。",
  UNSUPPORTED_TYPE: "JPEG・PNG・WebPの画像を選び直してください。",
  IMAGE_DECODE_FAILED: "別の画像でお試しください。",
  MODEL_DOWNLOAD_FAILED: "通信環境の良い場所で再試行してください。",
  WEBGPU_UNAVAILABLE: "そのまま再試行してください（自動的に別方式で処理します）。",
  WASM_INITIALIZATION_FAILED: "ブラウザを最新版へ更新して再度お試しください。",
  MODEL_INITIALIZATION_FAILED: "ページを再読み込みして再試行してください。",
  IMAGE_TOO_LARGE_FOR_DEVICE: "画像を縮小するか、別の端末でお試しください。",
  OUT_OF_MEMORY: "他のタブ・アプリを閉じて再試行してください。",
  COLORIZATION_FAILED: "もう一度お試しください。",
  PROCESS_CANCELLED: "もう一度「カラー化を開始する」を押してください。",
  UNSUPPORTED_BROWSER: "Chrome・Edge・Safariの最新版でお試しください。",
  INTERNAL_ERROR: "ページを再読み込みして再試行してください。",
};

/** ブラウザ内処理の実行バックエンド。 */
export type ColorizeBackend = "webgpu" | "wasm";

/** 進捗イベント。UI の進捗表示に使う。 */
export type ColorizeProgress =
  | { stage: "downloading_model"; loadedBytes: number; totalBytes: number | null }
  | { stage: "initializing"; backend: ColorizeBackend }
  | { stage: "inferring"; backend: ColorizeBackend }
  | { stage: "compositing" };

export class ColorizeError extends Error {
  readonly errorCode: ColorizeErrorCode;
  /** ブラウザ内処理のためサーバーの requestId は存在しない。セッション毎のIDで追跡する。 */
  readonly clientSessionId: string;

  constructor(errorCode: ColorizeErrorCode, clientSessionId: string, cause?: unknown) {
    super(COLORIZE_ERROR_MESSAGES[errorCode]);
    this.name = "ColorizeError";
    this.errorCode = errorCode;
    this.clientSessionId = clientSessionId;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export type ColorizeResult = {
  backend: ColorizeBackend;
  clientSessionId: string;
  timings: {
    modelDownloadMs: number;
    initMs: number;
    inferMs: number;
    compositeMs: number;
  };
  /** 元画像と結果画像のグレースケール構造差（L 0-100スケールの平均絶対差）。 */
  grayStructureMAD: number;
  warnings: string[];
};
