"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createInvitationAction, type AdminActionState } from "../actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-btn" disabled={pending} aria-disabled={pending}>
      {pending ? "招待メールを送信中…" : "招待メールを送る"}
    </button>
  );
}

/**
 * 新規ユーザー招待フォーム。
 * パスワードは扱わず、招待メールのリンクから本人がGoogleログインで会員化する。
 * 契約状態の既定は「支払い確認中」（入金確認後にactiveへ変更して利用可能になる）。
 */
export function InviteUserForm() {
  const [state, formAction] = useFormState<AdminActionState, FormData>(createInvitationAction, null);

  return (
    <details style={{ marginBottom: 18 }}>
      <summary className="admin-btn" style={{ cursor: "pointer", display: "inline-block" }}>
        ＋ 新規ユーザーを招待
      </summary>
      <form action={formAction} className="admin-form" style={{ marginTop: 12 }}>
        <label className="admin-form-field">
          <span>メールアドレス（Googleアカウント・必須）</span>
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
            <option value="payment_pending">支払い確認中（利用不可）</option>
            <option value="active">契約中（利用可）</option>
            <option value="unpaid">未払い（利用不可）</option>
            <option value="cancelled">解約（利用不可）</option>
          </select>
        </label>
        <div className="admin-form-actions">
          <SubmitButton />
          <span style={{ fontSize: "0.8rem", color: "#888" }}>
            招待リンクは、記載のGoogleアカウントでログインしたときのみ有効です。入金確認後に契約状態を「契約中」へ変更すると利用可能になります。
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
