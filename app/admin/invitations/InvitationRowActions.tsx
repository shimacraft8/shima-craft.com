"use client";

import { useFormState, useFormStatus } from "react-dom";
import { resendInvitationAction, revokeInvitationAction, type AdminActionState } from "../actions";

function PendingButton({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

export function InvitationRowActions({ invitationId }: { invitationId: string }) {
  const [resendState, resendAction] = useFormState<AdminActionState, FormData>(resendInvitationAction, null);
  const [revokeState, revokeAction] = useFormState<AdminActionState, FormData>(revokeInvitationAction, null);
  const notice = resendState ?? revokeState;

  return (
    <div className="admin-row-actions">
      <form action={resendAction}>
        <input type="hidden" name="invitation_id" value={invitationId} />
        <PendingButton label="再送" className="admin-btn admin-btn--ghost admin-btn--small" />
      </form>
      <form action={revokeAction}>
        <input type="hidden" name="invitation_id" value={invitationId} />
        <PendingButton label="取消" className="admin-btn admin-btn--danger admin-btn--small" />
      </form>
      {notice?.error && (
        <span className="admin-notice admin-notice--error" role="alert" style={{ padding: "2px 8px" }}>
          {notice.error}
        </span>
      )}
      {notice?.ok && (
        <span className="admin-notice admin-notice--ok" role="status" style={{ padding: "2px 8px" }}>
          {notice.ok}
        </span>
      )}
    </div>
  );
}
