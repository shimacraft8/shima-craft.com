"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { signInAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn auth-submit-btn" disabled={pending} aria-disabled={pending}>
      {pending ? "ログインしています…" : "ログイン"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(signInAction, null);

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <label className="auth-field">
        <span>メールアドレス</span>
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label className="auth-field">
        <span>パスワード</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
      <p className="auth-links">
        <Link href="/forgot-password">パスワードをお忘れの方はこちら</Link>
      </p>
    </form>
  );
}
