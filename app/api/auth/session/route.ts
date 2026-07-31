import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import {
  clearSessionCookieOnStore,
  createSessionCookieFromIdToken,
  getVerifiedSession,
  setSessionCookieOnStore,
  verifyIdTokenStrict,
  StaleAuthTimeError,
} from "@/lib/auth/session";
import { revokeAllRefreshTokens } from "@/lib/firebase/rest/authAdmin";
import { resolveLogin } from "@/lib/members/login";
import { checkLoginRateLimit } from "@/lib/rateLimit/loginRateLimit";

/**
 * resolveLogin（Firestore REST経由、Stage 7以降で全面移行済み）は想定内の理由で
 * 失敗し得る（Firestore REST APIの一時的な5xx/timeout等）。ここで捕捉し、
 * 呼び出し元へは一般化された503として返す（生の例外・スタックはクライアントへ出さない）。
 */
async function resolveLoginSafely(
  decoded: Awaited<ReturnType<typeof verifyIdTokenStrict>>,
  invitationToken: string | null
): Promise<
  | { ok: true; uid: string }
  | { ok: false; reason: "STALE_AUTH" | "NOT_REGISTERED" | "SUSPENDED" | "INVALID_INVITATION" }
  | { ok: false; reason: "MEMBERSHIP_CHECK_UNAVAILABLE" }
> {
  try {
    return await resolveLogin(decoded, invitationToken);
  } catch {
    return { ok: false, reason: "MEMBERSHIP_CHECK_UNAVAILABLE" };
  }
}

export const runtime = "nodejs";

/** リクエストボディの最大許容サイズ（idToken+invitationTokenのJSON。実際のID Tokenは1〜2KB程度）。 */
const MAX_SESSION_REQUEST_BODY_BYTES = 16 * 1024;

const REASON_MESSAGE: Record<string, string> = {
  STALE_AUTH: "ログイン情報の有効期限が切れています。もう一度ログインしてください。",
  NOT_REGISTERED:
    "このGoogleアカウントは利用登録されていません。ご利用にはSHIMA CRAFTが発行した招待が必要です。",
  SUSPENDED:
    "このアカウントは現在ご利用いただけません。契約状況についてSHIMA CRAFTへお問い合わせください。",
  INVALID_INVITATION:
    "招待リンクが無効か、招待されたメールアドレスと一致しません。招待メールをご確認ください。",
  INVALID_TOKEN: "認証に失敗しました。もう一度ログインしてください。",
  MEMBERSHIP_CHECK_UNAVAILABLE: "現在この機能はご利用いただけません。しばらくしてから再度お試しください。",
  RATE_LIMITED: "ログイン試行が多すぎます。しばらくしてから再度お試しください。",
};

/**
 * ログイン: Google ID Token を検証し、招待/既存会員/初期adminを確認して
 * Firebase Session Cookie を発行する。
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }

  const rateLimit = await checkLoginRateLimit(request.headers);
  if (rateLimit.limited) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED", message: REASON_MESSAGE.RATE_LIMITED },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, reason: "INVALID_CONTENT_TYPE" }, { status: 400 });
  }

  const rawBody = await request.text().catch(() => null);
  if (rawBody === null || rawBody.length === 0) {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }
  if (rawBody.length > MAX_SESSION_REQUEST_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: "BODY_TOO_LARGE" }, { status: 413 });
  }

  let body: { idToken?: unknown; invitationToken?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const invitationToken =
    typeof body.invitationToken === "string" && body.invitationToken ? body.invitationToken : null;
  if (!idToken) {
    return NextResponse.json({ ok: false, reason: "INVALID_TOKEN" }, { status: 400 });
  }

  let decoded: Awaited<ReturnType<typeof verifyIdTokenStrict>>;
  try {
    decoded = await verifyIdTokenStrict(idToken);
  } catch (e) {
    if (e instanceof StaleAuthTimeError) {
      return NextResponse.json(
        { ok: false, reason: "STALE_AUTH", message: REASON_MESSAGE.STALE_AUTH },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, reason: "INVALID_TOKEN", message: REASON_MESSAGE.INVALID_TOKEN },
      { status: 401 }
    );
  }

  const result = await resolveLoginSafely(decoded, invitationToken);
  if (!result.ok) {
    const status = result.reason === "MEMBERSHIP_CHECK_UNAVAILABLE" ? 503 : 403;
    return NextResponse.json(
      { ok: false, reason: result.reason, message: REASON_MESSAGE[result.reason] ?? "ログインできませんでした。" },
      { status }
    );
  }

  try {
    const cookie = await createSessionCookieFromIdToken(idToken);
    setSessionCookieOnStore(cookie);
  } catch {
    return NextResponse.json({ ok: false, reason: "SESSION_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** ログアウト: Session Cookie削除 + refresh token失効。 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const decoded = await getVerifiedSession();
    if (decoded) {
      await revokeAllRefreshTokens(decoded.uid).catch(() => {});
    }
  } finally {
    clearSessionCookieOnStore();
  }
  return NextResponse.json({ ok: true });
}
