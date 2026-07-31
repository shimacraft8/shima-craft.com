import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import { isSecureCookieContext } from "@/lib/http/secureCookie";
import { getViewer } from "@/lib/auth/access";
import { createExecution } from "@/lib/members/executions";
import {
  checkAndIncrementFreeGate,
  isFreeGateEnabled,
  FREE_GATE_COOKIE,
} from "@/lib/colorization/freeGate";

export const runtime = "nodejs";

/**
 * カラー化の実行許可を発行する。
 *
 * ■ 会員（ログイン済み）: Session Cookie 検証 + member のステータス確認
 * ■ 未ログイン（無料公開モード): 日次 Cookie で 1日3回まで許可
 *   - COLORIZE_REQUIRE_LOGIN=true にすると無料公開を無効にしてログイン必須に戻せる
 *
 * 成功時のみ executionId を返す（これが無いとクライアントはモデルを読み込まない）。
 * 画像データ・ファイル名は受け取らない（寸法・容量のみ）。
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  if (process.env.COLORIZE_ENABLED === "false") {
    return NextResponse.json({ ok: false, reason: "SERVICE_DISABLED" }, { status: 503 });
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

  const viewer = await getViewer();

  // ---- 会員パス ----
  if (viewer.kind !== "anonymous") {
    if (!viewer.canColorize) {
      return NextResponse.json({ ok: false, reason: "NOT_ALLOWED" }, { status: 403 });
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
      return NextResponse.json({ ok: true, executionId, remaining: null, isMember: true });
    } catch {
      return NextResponse.json({ ok: false, reason: "INTERNAL_ERROR" }, { status: 500 });
    }
  }

  // ---- 無料公開パス ----
  if (!isFreeGateEnabled()) {
    return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
  }

  const cookieValue = request.cookies.get(FREE_GATE_COOKIE)?.value;
  const gate = checkAndIncrementFreeGate(cookieValue);

  if (!gate.allowed) {
    return NextResponse.json({ ok: false, reason: "DAILY_LIMIT", remaining: 0 }, { status: 429 });
  }

  // 無料実行は Firestore に書かず、ランダム UUID をそのまま executionId とする
  const executionId = `anon-${crypto.randomUUID()}`;

  const res = NextResponse.json({
    ok: true,
    executionId,
    remaining: gate.remaining,
    used: gate.used,
    total: 3,
    isMember: false,
  });

  res.cookies.set(FREE_GATE_COOKIE, gate.newCookieValue, {
    httpOnly: true,
    secure: isSecureCookieContext(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 48, // 2日（JST でのリセットをカバー）
  });

  return res;
}
