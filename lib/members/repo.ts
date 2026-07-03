import "server-only";
import { Timestamp, FieldValue, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type {
  AdminAuditLog,
  ColorizationExecution,
  ColorizationLog,
  Invitation,
  Member,
} from "./types";

/**
 * Firestore データアクセス層（Admin SDK・サーバー専用）。
 * Firestore Timestamp ↔ ISO文字列 の変換をここへ集約する。
 */

export const COLLECTIONS = {
  members: "members",
  invitations: "invitations",
  executions: "colorizationExecutions",
  logs: "colorizationLogs",
  audit: "adminAuditLogs",
  systemConfig: "systemConfig",
} as const;

export const MEMBERSHIP_CONFIG_DOC = "membership";

function ts(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapMember(id: string, d: DocumentData): Member {
  return {
    uid: id,
    email: str(d.email),
    emailLower: str(d.emailLower),
    displayName: str(d.displayName),
    role: d.role === "admin" ? "admin" : "user",
    accountStatus: ["active", "suspended", "deleted"].includes(d.accountStatus)
      ? d.accountStatus
      : "suspended",
    contractStatus: ["active", "payment_pending", "unpaid", "cancelled"].includes(d.contractStatus)
      ? d.contractStatus
      : "payment_pending",
    notes: str(d.notes),
    lastLoginAt: ts(d.lastLoginAt),
    lastUsedAt: ts(d.lastUsedAt),
    createdAt: ts(d.createdAt) ?? new Date(0).toISOString(),
    updatedAt: ts(d.updatedAt) ?? new Date(0).toISOString(),
    deletedAt: ts(d.deletedAt),
    authDisabledAt: ts(d.authDisabledAt),
  };
}

export function mapInvitation(id: string, d: DocumentData): Invitation {
  return {
    id,
    emailLower: str(d.emailLower),
    emailHash: str(d.emailHash),
    tokenHash: str(d.tokenHash),
    role: d.role === "admin" ? "admin" : "user",
    accountStatus: str(d.accountStatus, "active") as Invitation["accountStatus"],
    contractStatus: str(d.contractStatus, "payment_pending") as Invitation["contractStatus"],
    displayName: str(d.displayName),
    status: str(d.status, "pending") as Invitation["status"],
    expiresAt: ts(d.expiresAt) ?? new Date(0).toISOString(),
    createdBy: str(d.createdBy),
    createdAt: ts(d.createdAt) ?? new Date(0).toISOString(),
    claimedBy: str(d.claimedBy) || null,
    claimedAt: ts(d.claimedAt),
    resentAt: ts(d.resentAt),
  };
}

export function mapExecution(id: string, d: DocumentData): ColorizationExecution {
  return {
    id,
    userId: str(d.userId),
    status: str(d.status, "started") as ColorizationExecution["status"],
    processingMode: (d.processingMode === "webgpu" || d.processingMode === "wasm") ? d.processingMode : null,
    inputWidth: numOrNull(d.inputWidth),
    inputHeight: numOrNull(d.inputHeight),
    inputFileSize: numOrNull(d.inputFileSize),
    outputWidth: numOrNull(d.outputWidth),
    outputHeight: numOrNull(d.outputHeight),
    durationMs: numOrNull(d.durationMs),
    errorCode: str(d.errorCode) || null,
    clientRequestId: str(d.clientRequestId) || null,
    retryOfExecutionId: str(d.retryOfExecutionId) || null,
    startedAt: ts(d.startedAt) ?? new Date(0).toISOString(),
    completedAt: ts(d.completedAt),
    updatedAt: ts(d.updatedAt) ?? new Date(0).toISOString(),
    downloadClickedAt: ts(d.downloadClickedAt),
  };
}

export function mapLog(id: string, d: DocumentData): ColorizationLog {
  return {
    id,
    userId: str(d.userId),
    executionId: str(d.executionId),
    eventType: str(d.eventType) as ColorizationLog["eventType"],
    status: str(d.status),
    processingMode: (d.processingMode === "webgpu" || d.processingMode === "wasm") ? d.processingMode : null,
    imageWidth: numOrNull(d.imageWidth),
    imageHeight: numOrNull(d.imageHeight),
    durationMs: numOrNull(d.durationMs),
    errorCode: str(d.errorCode) || null,
    browserName: str(d.browserName) || null,
    deviceType: (["mobile", "tablet", "desktop", "unknown"].includes(d.deviceType) ? d.deviceType : null),
    createdAt: ts(d.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapAudit(id: string, d: DocumentData): AdminAuditLog {
  return {
    id,
    adminUserId: str(d.adminUserId),
    action: str(d.action),
    targetUserId: str(d.targetUserId) || null,
    beforeData: (d.beforeData ?? null) as Record<string, unknown> | null,
    afterData: (d.afterData ?? null) as Record<string, unknown> | null,
    requestId: str(d.requestId),
    ipHash: str(d.ipHash) || null,
    userAgent: str(d.userAgent) || null,
    createdAt: ts(d.createdAt) ?? new Date(0).toISOString(),
  };
}

// ─── members ───

export async function getMember(uid: string): Promise<Member | null> {
  const snap = await adminDb().collection(COLLECTIONS.members).doc(uid).get();
  if (!snap.exists) return null;
  return mapMember(snap.id, snap.data() as DocumentData);
}

export async function findMemberByEmail(emailLower: string): Promise<Member | null> {
  const q = await adminDb()
    .collection(COLLECTIONS.members)
    .where("emailLower", "==", emailLower)
    .limit(1)
    .get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return mapMember(doc.id, doc.data() as DocumentData);
}

export async function touchLastLogin(uid: string): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.members)
    .doc(uid)
    .set({ lastLoginAt: FieldValue.serverTimestamp() }, { merge: true });
}

export { Timestamp, FieldValue };
