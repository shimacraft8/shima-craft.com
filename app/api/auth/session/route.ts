import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import {
  clearSessionCookieOnStore,
  createSessionCookieFromIdToken,
  getVerifiedSession,
  setSessionCookieOnStore,
  verifyIdTokenStrict,
} from "@/lib/auth/session";
import { resolveLogin } from "@/lib/members/login";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const REASON_MESSAGE: Record<string, string> = {
  STALE_AUTH: "ログイン情報の有効期限が切れています。もう一度ログインしてください。",
  NOT_REGISTERED:
    "このGoogleアカウントは利用登録されていません。ご利用にはSHIMA CRAFTが発行した招待が必要です。",
  SUSPENDED:
    "このアカウントは現在ご利用いただけません。契約状況についてSHIMA CRAFTへお問い合わせください。",
  INVALID_INVITATION:
    "招待リンクが無効か、招待されたメールアドレスと一致しません。招待メールをご確認ください。",
  INVALID_TOKEN: "認証に失敗しました。もう一度ログインしてください。",
};

/**
 * ログイン: Google ID Token を検証し、招待/既存会員/初期adminを確認して
 * Firebase Session Cookie を発行する。
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }

  let body: { idToken?: unknown; invitationToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "INVALID_JSON" }, { status: 400 });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const invitationToken =
    typeof body.invitationToken === "string" && body.invitationToken ? body.invitationToken : null;
  if (!idToken) {
    return NextResponse.json({ ok: false, reason: "INVALID_TOKEN" }, { status: 400 });
  }

  const decoded = await verifyIdTokenStrict(idToken).catch(() => null);
  if (!decoded) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_TOKEN", message: REASON_MESSAGE.INVALID_TOKEN },
      { status: 401 }
    );
  }

  const result = await resolveLogin(decoded, invitationToken);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason, message: REASON_MESSAGE[result.reason] ?? "ログインできませんでした。" },
      { status: 403 }
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
      await adminAuth().revokeRefreshTokens(decoded.uid).catch(() => {});
    }
  } finally {
    clearSessionCookieOnStore();
  }
  return NextResponse.json({ ok: true });
}
