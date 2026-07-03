/**
 * 会員制カラー化サービスのドメイン型（Firestore collections と一致させる）。
 * すべてのFirestoreアクセスはFirebase Admin SDKを使うサーバー側に限定する。
 */

export type UserRole = "admin" | "user";
export type AccountStatus = "active" | "suspended" | "deleted";
export type ContractStatus = "active" | "payment_pending" | "unpaid" | "cancelled";

/** members/{uid} */
export type Member = {
  uid: string;
  email: string;
  emailLower: string;
  displayName: string;
  role: UserRole;
  accountStatus: AccountStatus;
  contractStatus: ContractStatus;
  notes: string;
  lastLoginAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  authDisabledAt: string | null;
};

export type InvitationStatus = "pending" | "claimed" | "expired" | "revoked" | "delivery_failed";

/** invitations/{invitationId}（raw tokenは保存しない。tokenHashのみ） */
export type Invitation = {
  id: string;
  emailLower: string;
  emailHash: string;
  tokenHash: string;
  role: UserRole;
  accountStatus: AccountStatus;
  contractStatus: ContractStatus;
  displayName: string;
  status: InvitationStatus;
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  claimedBy: string | null;
  claimedAt: string | null;
  resentAt: string | null;
};

export const COLORIZE_LOG_EVENT_TYPES = [
  "colorize_started",
  "model_download_started",
  "model_download_completed",
  "colorize_succeeded",
  "colorize_failed",
  "colorize_cancelled",
  "download_clicked",
] as const;
export type ColorizeLogEventType = (typeof COLORIZE_LOG_EVENT_TYPES)[number];

export type ExecutionStatus = "started" | "succeeded" | "failed" | "cancelled";
export type ProcessingMode = "webgpu" | "wasm";

/** colorizationExecutions/{executionId} */
export type ColorizationExecution = {
  id: string;
  userId: string;
  status: ExecutionStatus;
  processingMode: ProcessingMode | null;
  inputWidth: number | null;
  inputHeight: number | null;
  inputFileSize: number | null;
  outputWidth: number | null;
  outputHeight: number | null;
  durationMs: number | null;
  errorCode: string | null;
  clientRequestId: string | null;
  retryOfExecutionId: string | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  downloadClickedAt: string | null;
};

/** colorizationLogs/{logId} */
export type ColorizationLog = {
  id: string;
  userId: string;
  executionId: string;
  eventType: ColorizeLogEventType;
  status: string;
  processingMode: ProcessingMode | null;
  imageWidth: number | null;
  imageHeight: number | null;
  durationMs: number | null;
  errorCode: string | null;
  browserName: string | null;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown" | null;
  createdAt: string;
};

/** adminAuditLogs/{auditId} */
export type AdminAuditLog = {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  requestId: string;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: string;
};

/**
 * カラー化ツールを利用できる条件。
 * 会員制の要件: accountStatus=active かつ contractStatus=active のみ。
 * （payment_pending は入金確認前のため利用不可。管理者が active へ変更して初めて利用可能。）
 */
export function canUseColorize(
  member: Pick<Member, "accountStatus" | "contractStatus">
): boolean {
  return member.accountStatus === "active" && member.contractStatus === "active";
}
