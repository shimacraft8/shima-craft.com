"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Member } from "@/lib/members/types";
import {
  reactivateMemberAction,
  softDeleteMemberAction,
  suspendMemberAction,
  updateMemberAction,
  type AdminActionState,
} from "../../actions";

function Notice({ state }: { state: AdminActionState }) {
  if (!state) return null;
  if (state.ok) return <p className="admin-notice admin-notice--ok" role="status">{state.ok}</p>;
  return (
    <p className="admin-notice admin-notice--error" role="alert">
      {state.error}
      {state.requestId && <small>（操作ID: {state.requestId}）</small>}
    </p>
  );
}

function PendingButton({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function EditMemberForm({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const [updateState, updateAction] = useFormState<AdminActionState, FormData>(updateMemberAction, null);
  const [suspendState, suspendAction] = useFormState<AdminActionState, FormData>(suspendMemberAction, null);
  const [reactivateState, reactivateAction] = useFormState<AdminActionState, FormData>(reactivateMemberAction, null);
  const [deleteState, deleteAction] = useFormState<AdminActionState, FormData>(softDeleteMemberAction, null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <>
      <Notice state={updateState} />
      <Notice state={suspendState} />
      <Notice state={reactivateState} />
      <Notice state={deleteState} />

      <form action={updateAction} className="admin-form">
        <input type="hidden" name="uid" value={member.uid} />
        <label className="admin-form-field">
          <span>メールアドレス（Google・変更不可）</span>
          <input type="email" value={member.email} disabled />
        </label>
        <label className="admin-form-field">
          <span>表示名</span>
          <input type="text" name="display_name" defaultValue={member.displayName} maxLength={100} />
        </label>
        <label className="admin-form-field">
          <span>role</span>
          <select name="role" defaultValue={member.role} disabled={isSelf}>
            <option value="user">一般</option>
            <option value="admin">管理者</option>
          </select>
        </label>
        <label className="admin-form-field">
          <span>アカウント状態</span>
          <select name="account_status" defaultValue={member.accountStatus} disabled={isSelf}>
            <option value="active">有効</option>
            <option value="suspended">停止中</option>
            <option value="deleted">削除済み</option>
          </select>
        </label>
        <label className="admin-form-field">
          <span>契約状態</span>
          <select name="contract_status" defaultValue={member.contractStatus}>
            <option value="active">契約中（利用可）</option>
            <option value="payment_pending">支払い確認中（利用不可）</option>
            <option value="unpaid">未払い（利用不可）</option>
            <option value="cancelled">解約（利用不可）</option>
          </select>
        </label>
        <label className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
          <span>備考</span>
          <textarea name="notes" rows={2} defaultValue={member.notes} maxLength={2000} />
        </label>
        {isSelf && (
          <p style={{ gridColumn: "1 / -1", fontSize: "0.8rem", color: "#888" }}>
            自分自身のrole・アカウント状態は変更できません。
          </p>
        )}
        <div className="admin-form-actions">
          <PendingButton label="更新する" pendingLabel="更新中…" className="admin-btn" />
          <span style={{ fontSize: "0.8rem", color: "#888" }}>
            メールアドレスはGoogleアカウントに紐づくため変更できません。別メールへ移す場合は、新しいメールで招待し直してください。
          </span>
        </div>
      </form>

      <div className="admin-row-actions" style={{ marginBottom: 20 }}>
        {!isSelf && member.accountStatus === "active" && (
          <form action={suspendAction}>
            <input type="hidden" name="uid" value={member.uid} />
            <PendingButton label="利用を停止する" pendingLabel="停止中…" className="admin-btn admin-btn--ghost" />
          </form>
        )}
        {!isSelf && member.accountStatus !== "active" && (
          <form action={reactivateAction}>
            <input type="hidden" name="uid" value={member.uid} />
            <PendingButton label="利用を再開する" pendingLabel="再開中…" className="admin-btn admin-btn--ghost" />
          </form>
        )}
        {!isSelf && member.accountStatus !== "deleted" && (
          <button type="button" className="admin-btn admin-btn--danger" onClick={() => setDeleteConfirmOpen(true)}>
            削除する
          </button>
        )}
      </div>

      {deleteConfirmOpen && (
        <div className="admin-form" role="alertdialog" aria-label="削除の確認">
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={{ marginBottom: 8 }}>
              <strong>{member.email}</strong> を削除（無効化）しますか？
            </p>
            <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: 12 }}>
              削除はアカウントの無効化（soft delete）です。ログインできなくなりますが、利用ログ・監査ログは保持されます。支払い未確認が理由の場合は、削除ではなく「利用停止」をおすすめします。
            </p>
            <div className="admin-row-actions">
              <form action={deleteAction}>
                <input type="hidden" name="uid" value={member.uid} />
                <input type="hidden" name="confirm" value="true" />
                <PendingButton label="削除を実行する" pendingLabel="削除中…" className="admin-btn admin-btn--danger" />
              </form>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setDeleteConfirmOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
