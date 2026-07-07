import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import { getViewer } from "@/lib/auth/access";
import { ExecutionAccessError, recordExecutionEvent } from "@/lib/members/executions";
import { COLORIZE_LOG_EVENT_TYPES, type ColorizeLogEventType } from "@/lib/members/types";
import { detectBrowserName, detectDeviceType } from "@/lib/logging/userAgent";

export const runtime = "nodejs";

/**
 * カラー化イベントの記録。
 * - Session Cookieを再検証し、executionが同じuserIdに属することを確認（IDOR防止）
 * - server timestampを使用（client時刻を信用しない）
 * - logDocIdで二重記録防止（idempotent）
 * - 画像・ファイル名は受け取らない
 * - ログ記録の失敗はHTTPエラーで返すが、クライアントは完成画像を消さない設計
 *   （ただし認証・所有権チェックの失敗は拒否＝fail-closed）
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }

  const viewer = await getViewer();
  // 無料公開モードの匿名ユーザーは Firestore へ書かず 200 OK を返す（ログ省略）
  if (viewer.kind === "anonymous") {
    return NextResponse.json({ ok: true });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2048) {
      return NextResponse.json({ ok: false, reason: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }

  const executionId = typeof body.executionId === "string" ? body.executionId : "";
  const eventType = body.eventType as ColorizeLogEventType;
  if (!executionId || !COLORIZE_LOG_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ ok: false, reason: "INVALID_EVENT" }, { status: 400 });
  }

  const int = (v: unknown, max: number): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null;
  const mode = body.processingMode === "webgpu" || body.processingMode === "wasm" ? body.processingMode : null;
  const ua = request.headers.get("user-agent") ?? "";

  try {
    await recordExecutionEvent(viewer.member.uid, {
      executionId,
      eventType,
      status: typeof body.status === "string" ? body.status.slice(0, 32) : "",
      processingMode: mode,
      imageWidth: int(body.imageWidth, 100000),
      imageHeight: int(body.imageHeight, 100000),
      outputWidth: int(body.outputWidth, 100000),
      outputHeight: int(body.outputHeight, 100000),
      durationMs: int(body.durationMs, 86_400_000),
      errorCode: typeof body.errorCode === "string" ? body.errorCode.slice(0, 64) : null,
      browserName: detectBrowserName(ua),
      deviceType: detectDeviceType(ua),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ExecutionAccessError) {
      return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, reason: "LOG_FAILED" }, { status: 500 });
  }
}
