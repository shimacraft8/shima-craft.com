"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import type { Profile } from "@/lib/supabase/types";

export type LoginState = { error: string } | null;

/**
 * メール+パスワードでログインする。
 * 停止・削除済みアカウントは認証成功後でも即サインアウトして拒否する。
 */
export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。" };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // 利用停止（authレベルban）はパスワード誤りと区別して案内する
    if (error && (error.code === "user_banned" || /banned/i.test(error.message))) {
      return {
        error:
          "このアカウントは現在ご利用いただけません。契約状況についてSHIMA CRAFTへお問い合わせください。",
      };
    }
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();

  if (!profile || profile.account_status !== "active") {
    await supabase.auth.signOut();
    return {
      error:
        "このアカウントは現在ご利用いただけません。契約状況についてSHIMA CRAFTへお問い合わせください。",
    };
  }

  // 最終ログイン日時を記録（本人のRLSでは更新不可のためサーバー権限で更新）
  try {
    const admin = createSupabaseAdminClient();
    await admin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.user.id);
  } catch {
    // 記録失敗はログイン自体を妨げない
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type ForgotPasswordState = { error?: string; sent?: boolean } | null;

/** パスワード再設定メールを送る。アカウントの有無は応答から判別できないようにする。 */
export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "メールアドレスを入力してください。" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });
  // 存在しないメールでも同じ応答（ユーザー列挙防止）
  return { sent: true };
}

export type ResetPasswordState = { error?: string; done?: boolean } | null;

/** 再設定リンクで確立したセッションで新しいパスワードを設定する。 */
export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 10) {
    return { error: "パスワードは10文字以上で設定してください。" };
  }
  if (password !== confirm) {
    return { error: "確認用パスワードが一致しません。" };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "再設定リンクの有効期限が切れています。もう一度メールからやり直してください。" };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "パスワードを更新できませんでした。しばらくしてから再度お試しください。" };
  }
  return { done: true };
}
