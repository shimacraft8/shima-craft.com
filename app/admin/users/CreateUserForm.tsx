"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createUserAction, type AdminActionState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-btn" disabled={pending} aria-disabled={pending}>
      {pending ? "招待メールを送信中…" : "作成して招待メールを送る"}
    </button>
  );
}

/**
 * ユーザー新規作成。パスワードは管理者が決めず、
 * 招待メールから利用者本人が設定する方式。
 */
export function CreateUserForm() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [state, formAction] = useFormState<AdminActionState, FormData>(createUserAction, null);

  return (
    <details ref={detailsRef} style={{ marginBottom: 18 }}>
      <summary className="admin-btn" style={{ cursor: "pointer", display: "inline-block" }}>
        ＋ 新規ユーザーを作成
      </summary>
      <form action={formAction} className="admin-form" style={{ marginTop: 12 }}>
        <label className="admin-form-field">
          <span>メールアドレス（必須）</span>
          <input type="email" name="email" required />
        </label>
        <label className="admin-form-field">
          <span>表示名</span>
          <input type="text" name="display_name" maxLength={100} />
        </label>
        <label className="admin-form-field">
          <span>role</span>
          <select name="role" defaultValue="user">
            <option value="user">一般</option>
            <option value="admin">管理者</option>
          </select>
        </label>
        <label className="admin-form-field">
          <span>契約状態</span>
          <select name="contract_status" defaultValue="payment_pending">
            <option value="active">契約中</option>
            <option value="payment_pending">支払い確認中</option>
            <option value="unpaid">未払い</option>
            <option value="cancelled">解約</option>
          </select>
        </label>
        <label className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
          <span>備考</span>
          <textarea name="notes" rows={2} maxLength={2000} />
        </label>
        <div className="admin-form-actions">
          <SubmitButton />
          <span style={{ fontSize: "0.8rem", color: "#888" }}>
            初回パスワードは利用者本人が招待メールのリンクから設定します（平文パスワードの共有は行いません）。
          </span>
        </div>
        {state?.ok && <p className="admin-notice admin-notice--ok" role="status">{state.ok}</p>}
        {state?.error && (
          <p className="admin-notice admin-notice--error" role="alert">
            {state.error}
            {state.requestId && <small>（操作ID: {state.requestId}）</small>}
          </p>
        )}
      </form>
    </details>
  );
}
