import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import { isSecureCookieContext } from "@/lib/http/secureCookie";
import {
  checkAndIncrementFreeGate,
  secondsUntilNextJstMidnight,
  FREE_GATE_COOKIE,
} from "@/lib/colorization/freeGate";
import { checkColorizeIpLimit, incrementColorizeIpCount } from "@/lib/rateLimit/colorizeIpLimit";

export const runtime = "nodejs";

/**
 * カラー化の実行許可を発行する（ログイン不要・全員公開）。
 *
 * 利用制限は2層:
 * 1. 匿名Cookie（1日3回、JST 0時リセット）— lib/colorization/freeGate.ts
 * 2. IPハッシュ+Cloudflare KVの補助制限 — lib/rateLimit/colorizeIpLimit.ts
 *    （Cookieを削除しただけでは無制限にならないようにする）
 * いずれかが上限に達していれば拒否する。許可した場合のみ両方のカウントを進める。
 *
 * 成功時のみ executionId を返す（これが無いとクライアントはモデルを読み込まない）。
 * 画像データ・ファイル名は受け取らない（寸法・容量のみ）。実行結果はサーバーへ保存しない。
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  if (process.env.COLORIZE_ENABLED === "false") {
    return NextResponse.json({ ok: false, reason: "SERVICE_DISABLED" }, { status: 503 });
  }

  try {
    const raw = await request.text();
    if (raw.length > 1024) {
      return NextResponse.json({ ok: false, reason: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }
    if (raw) JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }

  const cookieValue = request.cookies.get(FREE_GATE_COOKIE)?.value;
  const gate = checkAndIncrementFreeGate(cookieValue);

  if (!gate.allowed) {
    return NextResponse.json(
      { ok: false, reason: "DAILY_LIMIT", remaining: 0 },
      { status: 429, headers: { "Retry-After": String(secondsUntilNextJstMidnight()) } }
    );
  }

  const ipGate = await checkColorizeIpLimit(request.headers);
  if (ipGate.limited) {
    return NextResponse.json(
      { ok: false, reason: "DAILY_LIMIT", remaining: 0 },
      { status: 429, headers: { "Retry-After": String(ipGate.retryAfterSeconds) } }
    );
  }

  // 無料実行はどこにも書かず、ランダム UUID をそのまま executionId とする
  const executionId = `anon-${crypto.randomUUID()}`;

  const res = NextResponse.json({
    ok: true,
    executionId,
    remaining: gate.remaining,
    used: gate.used,
  });

  res.cookies.set(FREE_GATE_COOKIE, gate.newCookieValue, {
    httpOnly: true,
    secure: isSecureCookieContext(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 48, // 2日（JST でのリセットをカバー）
  });

  await incrementColorizeIpCount(request.headers);

  return res;
}
