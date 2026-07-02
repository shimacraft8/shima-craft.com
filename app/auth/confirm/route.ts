import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * メールリンク（招待・パスワード再設定・メール変更確認）の着地点。
 * token_hashを検証してセッションを確立し、目的のページへリダイレクトする。
 * 参照: Supabase公式のNext.js Server-Side Authパターン
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(searchParams.get("next"));

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirectTo.pathname = next;
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.search = "?error=link";
  return NextResponse.redirect(redirectTo);
}
