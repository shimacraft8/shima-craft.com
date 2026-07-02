"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { resetPasswordAction, type ResetPasswordState } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn auth-submit-btn" disabled={pending} aria-disabled={pending}>
      {pending ? "設定しています…" : "パスワードを設定する"}
    </button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useFormState<ResetPasswordState, FormData>(resetPasswordAction, null);

  if (state?.done) {
    return (
      <div className="auth-form" role="status">
        <p>パスワードを設定しました。</p>
        <p className="auth-links">
          <Link href="/tools/photo-colorize" className="btn">
            カラー化サービスを利用する
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="auth-form">
      <label className="auth-field">
        <span>新しいパスワード（10文字以上）</span>
        <input type="password" name="password" autoComplete="new-password" minLength={10} required />
      </label>
      <label className="auth-field">
        <span>新しいパスワード（確認）</span>
        <input type="password" name="confirm" autoComplete="new-password" minLength={10} required />
      </label>
      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
