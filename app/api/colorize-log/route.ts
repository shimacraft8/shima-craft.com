import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { COLORIZE_LOG_EVENT_TYPES, type ColorizeLogEventType, type Profile } from "@/lib/supabase/types";
import { detectBrowserName, detectDeviceType } from "@/lib/logging/userAgent";

export const runtime = "nodejs";

/**
 * 会員の利用ログ記録（サーバー経由のみ）。
 * - user_id はセッションから強制（クライアント指定不可 = 他人へのなりすまし・偽造防止）
 * - colorization_logs にはクライアント直接insertのRLSポリシーが無いため、この経路が唯一
 * - 画像データ・ファイル名は受け取らない（bodyサイズ制限あり）
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<Profile>();
    if (!profile || profile.account_status !== "active") {
      return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
    }

    const raw = await request.text();
    if (raw.length > 2048) {
      return NextResponse.json({ ok: false, reason: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
    }

    const eventType = body.event_type as ColorizeLogEventType;
    if (!COLORIZE_LOG_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json({ ok: false, reason: "INVALID_EVENT" }, { status: 400 });
    }

    const int = (v: unknown, max: number): number | null =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null;
    const shortText = (v: unknown, max: number): string | null =>
      typeof v === "string" && v.length > 0 ? v.slice(0, max) : null;

    const ua = request.headers.get("user-agent") ?? "";

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("colorization_logs").insert({
      user_id: user.id, // セッション由来のみ。body.user_idは一切参照しない
      event_type: eventType,
      status: shortText(body.status, 32) ?? "",
      image_width: int(body.image_width, 100000),
      image_height: int(body.image_height, 100000),
      input_file_size: int(body.input_file_size, 1_000_000_000_000),
      output_width: int(body.output_width, 100000),
      output_height: int(body.output_height, 100000),
      processing_mode:
        body.processing_mode === "webgpu" || body.processing_mode === "wasm"
          ? body.processing_mode
          : null,
      duration_ms: int(body.duration_ms, 86_400_000),
      error_code: shortText(body.error_code, 64),
      browser_name: detectBrowserName(ua),
      device_type: detectDeviceType(ua),
    });

    if (error) {
      return NextResponse.json({ ok: false, reason: "LOG_FAILED" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "INTERNAL_ERROR" }, { status: 500 });
  }
}
