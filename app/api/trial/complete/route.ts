import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TRIAL_COOKIE_NAME,
  getTrialQuota,
  hashIdentity,
  ipHashFromHeaders,
  verifyTicket,
} from "@/lib/trial/trial";

export const runtime = "nodejs";

const RESULTS = ["succeeded", "failed", "cancelled"] as const;
type TrialResult = (typeof RESULTS)[number];

/**
 * 未会員お試しの結果報告。
 * - succeeded のみ回数を消費（チケットIDを主キーに使い、重複計上を防ぐ）
 * - failed / cancelled は記録のみで回数を消費しない
 * 画像データは受け取らない（bodyは小さなJSONのみ）。
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieValue = request.cookies.get(TRIAL_COOKIE_NAME)?.value;
    if (!cookieValue) {
      return NextResponse.json({ ok: false, reason: "NO_TRIAL_SESSION" }, { status: 400 });
    }
    const cookieHash = hashIdentity(cookieValue);
    const ipHash = ipHashFromHeaders(request.headers);

    const raw = await request.text();
    if (raw.length > 2048) {
      return NextResponse.json({ ok: false, reason: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    let body: {
      ticket?: unknown;
      result?: unknown;
      processing_mode?: unknown;
      duration_ms?: unknown;
      error_code?: unknown;
    };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
    }

    const result = body.result as TrialResult;
    if (!RESULTS.includes(result)) {
      return NextResponse.json({ ok: false, reason: "INVALID_RESULT" }, { status: 400 });
    }

    const ticket = typeof body.ticket === "string" ? verifyTicket(body.ticket, cookieHash) : null;
    if (!ticket) {
      return NextResponse.json({ ok: false, reason: "INVALID_TICKET" }, { status: 403 });
    }

    const processingMode =
      body.processing_mode === "webgpu" || body.processing_mode === "wasm"
        ? body.processing_mode
        : null;
    const durationMs =
      typeof body.duration_ms === "number" && body.duration_ms >= 0 && body.duration_ms <= 86_400_000
        ? Math.round(body.duration_ms)
        : null;
    const errorCode =
      typeof body.error_code === "string" ? body.error_code.slice(0, 64) : null;

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("trial_events").insert({
      // 成功はチケットIDを主キーにして同一チケットでの重複計上を防ぐ
      ...(result === "succeeded" ? { id: ticket.jti } : {}),
      cookie_hash: cookieHash,
      ip_hash: ipHash,
      event_type: `trial_${result}`,
      processing_mode: processingMode,
      duration_ms: durationMs,
      error_code: errorCode,
      user_agent: (request.headers.get("user-agent") ?? "").slice(0, 512),
    });

    if (error && result === "succeeded" && error.code === "23505") {
      // 同一チケットの再送。二重計上はしない
      const quota = await getTrialQuota(cookieHash, ipHash);
      return NextResponse.json({ ok: true, duplicated: true, remaining: quota.remaining });
    }
    if (error) {
      return NextResponse.json({ ok: false, reason: "LOG_FAILED" }, { status: 500 });
    }

    const quota = await getTrialQuota(cookieHash, ipHash);
    return NextResponse.json({ ok: true, remaining: quota.remaining, limit: quota.limit });
  } catch {
    return NextResponse.json({ ok: false, reason: "INTERNAL_ERROR" }, { status: 500 });
  }
}
