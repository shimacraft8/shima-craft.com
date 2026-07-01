import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  COLORIZE_ERROR_HTTP_STATUS,
  COLORIZE_ERROR_MESSAGES,
  COLORIZE_ERROR_RETRYABLE,
  type ColorizeApiResponse,
  type ColorizeErrorCode,
} from "@/lib/colorization/types";
import { detectImageType, decodeImageDimensions, MIN_IMAGE_DIMENSION } from "@/lib/colorization/validateImage";
import { colorizeRateLimiter } from "@/lib/colorization/rateLimit";
import { verifyTurnstileToken } from "@/lib/colorization/turnstile";
import { getClientIp } from "@/lib/colorization/ip";
import { getColorizationProvider } from "@/lib/colorization/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_MAX_BYTES = 4_000_000;

/**
 * 失敗レスポンスを組み立てつつ、Vercel Runtime LogsでrequestId・errorCodeから
 * 追跡できるよう1行ログを残す（秘密情報・スタックトレース・外部APIレスポンス全文は含めない）。
 */
function errorResponse(code: ColorizeErrorCode, requestId: string): NextResponse<ColorizeApiResponse> {
  console.error("[colorize] request failed", { requestId, errorCode: code });
  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      userMessage: COLORIZE_ERROR_MESSAGES[code],
      retryable: COLORIZE_ERROR_RETRYABLE[code],
      requestId,
    },
    { status: COLORIZE_ERROR_HTTP_STATUS[code] }
  );
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // 一部のブラウザ/同一オリジンのフォーム送信ではOriginが省略される
  const host = request.headers.get("host") ?? "";
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    "http://localhost:3000",
    "http://localhost:3001",
  ];
  return allowedOrigins.some((o) => origin.startsWith(o));
}

export async function POST(request: NextRequest): Promise<NextResponse<ColorizeApiResponse>> {
  const requestId = randomUUID();

  // ハンドラ内のどこで予期しない例外が起きても、Vercel側のFunction Invocation失敗(素の502)として
  // 落とすのではなく、必ず安全な日本語エラーとして返し、原因を秘密情報を含まない形でログに残す。
  try {
    if (process.env.COLORIZE_ENABLED === "false") {
      return errorResponse("SERVICE_DISABLED", requestId);
    }

    if (!isSameOrigin(request)) {
      return errorResponse("INVALID_FILE", requestId);
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch (err) {
      console.error("[colorize] formData parse failed", { requestId, name: errorName(err), message: errorMessage(err) });
      return errorResponse("INVALID_FILE", requestId);
    }

    const consent = form.get("consent");
    if (consent !== "true") {
      return errorResponse("CONSENT_REQUIRED", requestId);
    }

    const turnstileToken = form.get("turnstileToken");
    if (typeof turnstileToken !== "string" || !turnstileToken) {
      return errorResponse("TURNSTILE_FAILED", requestId);
    }

    const ip = getClientIp(request);

    const turnstileResult = await verifyTurnstileToken(turnstileToken, ip, fetch, requestId);
    if (!turnstileResult.ok) {
      return errorResponse(turnstileResult.reason === "not_configured" ? "SERVICE_DISABLED" : "TURNSTILE_FAILED", requestId);
    }

    const rateLimitResult = colorizeRateLimiter.check(ip);
    if (!rateLimitResult.ok) {
      return errorResponse("RATE_LIMITED", requestId);
    }

    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return errorResponse("INVALID_FILE", requestId);
    }

    const maxBytes = Number(process.env.COLORIZE_MAX_BYTES ?? DEFAULT_MAX_BYTES);
    if (file.size > (Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : DEFAULT_MAX_BYTES)) {
      return errorResponse("FILE_TOO_LARGE", requestId);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return errorResponse("UNSUPPORTED_TYPE", requestId);
    }

    const dimensions = decodeImageDimensions(buffer);
    if (!dimensions) {
      return errorResponse("IMAGE_DECODE_FAILED", requestId);
    }

    const warnings: string[] = [];
    if (dimensions.width < MIN_IMAGE_DIMENSION || dimensions.height < MIN_IMAGE_DIMENSION) {
      warnings.push("low_resolution");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    try {
      const provider = getColorizationProvider();
      const result = await provider.colorize(
        { imageBuffer: buffer, mimeType: detectedType },
        { signal: controller.signal, requestId }
      );

      if (!result.ok) {
        return errorResponse(result.code, requestId);
      }

      return NextResponse.json({
        success: true,
        resultUrl: result.resultUrl,
        model: result.model,
        warnings,
        requestId,
      });
    } catch (err) {
      console.error("[colorize] provider.colorize threw", { requestId, name: errorName(err), message: errorMessage(err) });
      return errorResponse("INTERNAL_ERROR", requestId);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error("[colorize] unhandled error in POST handler", { requestId, name: errorName(err), message: errorMessage(err) });
    return errorResponse("INTERNAL_ERROR", requestId);
  }
}

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
