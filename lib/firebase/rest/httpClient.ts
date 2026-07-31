import "server-only";

/**
 * Google API呼び出し共通: タイムアウト・エラー種別分類・in-flightリクエストの重複排除。
 * Cloudflare Workers・Node.jsの両方で動くWeb標準API（fetch, AbortSignal.timeout）のみを使う。
 */

export type GoogleApiErrorKind =
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error"
  | "unknown";

export class GoogleApiError extends Error {
  status: number;
  kind: GoogleApiErrorKind;
  constructor(status: number, kind: GoogleApiErrorKind, message: string) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
    this.kind = kind;
  }
}

function classify(status: number): GoogleApiErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "unknown";
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** fetchをタイムアウト付きで実行する。タイムアウト時はGoogleApiError(kind="timeout")を投げる。 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    // DOMExceptionはNode/jsdom/workerdで実装が異なり、必ずしもErrorを継承しないため
    // instanceof Errorではなく構造的に .name だけを見て判定する。
    const name = (e as { name?: unknown } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      let host = url;
      try {
        host = new URL(url).host;
      } catch {
        // urlが不正な場合はそのまま使う
      }
      throw new GoogleApiError(0, "timeout", `request to ${host} timed out after ${timeoutMs}ms`);
    }
    throw e;
  }
}

/** レスポンスがokでなければ、ステータスに応じて分類したGoogleApiErrorを投げる。本文はログ・例外に含めない。 */
export function assertOk(res: Response, context: string): void {
  if (!res.ok) {
    throw new GoogleApiError(res.status, classify(res.status), `${context} failed: HTTP ${res.status}`);
  }
}

/**
 * 同一キーへの同時呼び出しを1回の実行へ集約する（cache stampede対策）。
 * 呼び出し中のPromiseをMapに保持し、完了（成功/失敗どちらも）したら取り除く。
 */
export function dedupeInFlight<T>(
  inFlight: Map<string, Promise<T>>,
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = factory();
  inFlight.set(key, promise);
  // 呼び出し元へ返す promise 自体はそのまま reject させるが、クリーンアップ用の
  // 派生 promise は成功/失敗どちらでも解決させ、unhandled rejection を発生させない。
  promise.then(
    () => inFlight.delete(key),
    () => inFlight.delete(key)
  );
  return promise;
}
