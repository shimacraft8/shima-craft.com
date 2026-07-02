"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { forgotPasswordAction, type ForgotPasswordState } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn auth-submit-btn" disabled={pending} aria-disabled={pending}>
      {pending ? "送信しています…" : "再設定メールを送る"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState<ForgotPasswordState, FormData>(forgotPasswordAction, null);

  if (state?.sent) {
    return (
      <div className="auth-form" role="status">
        <p>
          入力されたメールアドレス宛に、パスワード再設定用のリンクを送信しました（登録がある場合）。メールをご確認ください。
        </p>
        <p className="auth-links">
          <Link href="/login">ログイン画面へ戻る</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="auth-form">
      <label className="auth-field">
        <span>メールアドレス</span>
        <input type="email" name="email" autoComplete="email" required />
      </label>
      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
      <p className="auth-links">
        <Link href="/login">ログイン画面へ戻る</Link>
      </p>
    </form>
  );
}
