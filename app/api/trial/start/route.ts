import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  TRIAL_COOKIE_NAME,
  getTrialQuota,
  hashIdentity,
  ipHashFromHeaders,
  issueTicket,
} from "@/lib/trial/trial";

export const runtime = "nodejs";

/**
 * 未会員お試しの開始。残回数を確認し、実行チケットを発行する。
 * 画像データは一切受け取らない。
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let cookieValue = request.cookies.get(TRIAL_COOKIE_NAME)?.value ?? "";
    const isNewCookie = !/^[0-9a-f-]{36}$/.test(cookieValue);
    if (isNewCookie) cookieValue = randomUUID();

    const cookieHash = hashIdentity(cookieValue);
    const ipHash = ipHashFromHeaders(request.headers);

    const quota = await getTrialQuota(cookieHash, ipHash);

    let body: NextResponse;
    if (quota.exhausted) {
      body = NextResponse.json(
        {
          ok: false,
          reason: "TRIAL_EXHAUSTED",
          remaining: 0,
          limit: quota.limit,
          userMessage:
            "無料お試しのご利用回数（3回）が上限に達しました。引き続きご利用いただくには、会員登録の申請をお願いいたします。",
        },
        { status: 403 }
      );
    } else {
      // 開始イベントを記録（カウント対象は成功のみ）
      try {
        const admin = createSupabaseAdminClient();
        await admin.from("trial_events").insert({
          cookie_hash: cookieHash,
          ip_hash: ipHash,
          event_type: "trial_started",
          user_agent: (request.headers.get("user-agent") ?? "").slice(0, 512),
        });
      } catch {
        // 記録失敗は開始を妨げない
      }
      body = NextResponse.json({
        ok: true,
        ticket: issueTicket(cookieHash),
        remaining: quota.remaining,
        limit: quota.limit,
      });
    }

    body.cookies.set(TRIAL_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
    return body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "INTERNAL_ERROR", userMessage: "一時的なエラーが発生しました。" },
      { status: 500 }
    );
  }
}
