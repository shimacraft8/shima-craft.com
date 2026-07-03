import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import { getViewer } from "@/lib/auth/access";
import { createExecution } from "@/lib/members/executions";

export const runtime = "nodejs";

/**
 * カラー化の実行許可を発行する。
 * - Session Cookie検証 + member の role/status/contract を確認（fail-closed）
 * - COLORIZE_ENABLED 確認
 * - executionId をサーバー生成し、colorize_started ログを作成
 * - 成功時のみ executionId を返す（これが無いとクライアントはモデルを読み込まない）
 * - 画像データ・ファイル名は受け取らない（寸法・容量のみ）
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  if (process.env.COLORIZE_ENABLED === "false") {
    return NextResponse.json({ ok: false, reason: "SERVICE_DISABLED" }, { status: 503 });
  }

  const viewer = await getViewer();
  if (viewer.kind === "anonymous") {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!viewer.canColorize) {
    return NextResponse.json({ ok: false, reason: "NOT_ALLOWED" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw.length > 1024) {
      return NextResponse.json({ ok: false, reason: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    if (raw) body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }

  const int = (v: unknown, max: number): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null;
  const shortText = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.length > 0 && v.length <= max ? v : null;

  try {
    const executionId = await createExecution(viewer.member.uid, {
      inputWidth: int(body.inputWidth, 100000),
      inputHeight: int(body.inputHeight, 100000),
      inputFileSize: int(body.inputFileSize, 1_000_000_000_000),
      clientRequestId: shortText(body.clientRequestId, 64),
      retryOfExecutionId: shortText(body.retryOfExecutionId, 64),
    });
    return NextResponse.json({ ok: true, executionId });
  } catch {
    return NextResponse.json({ ok: false, reason: "INTERNAL_ERROR" }, { status: 500 });
  }
}
