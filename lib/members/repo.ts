import "server-only";
import { commitWrites, getDoc, runQuery } from "@/lib/firebase/rest/firestore";
import { serverTimestamp } from "@/lib/firebase/rest/firestoreValues";
import type {
  AdminAuditLog,
  ColorizationExecution,
  ColorizationLog,
  Invitation,
  Member,
} from "./types";

/**
 * Firestore データアクセス層（Firestore REST・Cloudflare Workers対応）。
 * Firestoreの値 ↔ アプリの型 の変換をここへ集約する。
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
  // Firestore REST層(lib/firebase/rest/firestoreValues.ts)がtimestampValueを
  // 既にISO文字列へデコード済みのため、ここでは文字列をそのまま通す。
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapMember(id: string, d: Record<string, unknown>): Member {
  return {
    uid: id,
    email: str(d.email),
    emailLower: str(d.emailLower),
    displayName: str(d.displayName),
    role: d.role === "admin" ? "admin" : "user",
    accountStatus: ["active", "suspended", "deleted"].includes(d.accountStatus as string)
      ? (d.accountStatus as Member["accountStatus"])
      : "suspended",
    contractStatus: ["active", "payment_pending", "unpaid", "cancelled"].includes(d.contractStatus as string)
      ? (d.contractStatus as Member["contractStatus"])
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

export function mapInvitation(id: string, d: Record<string, unknown>): Invitation {
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

export function mapExecution(id: string, d: Record<string, unknown>): ColorizationExecution {
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

export function mapLog(id: string, d: Record<string, unknown>): ColorizationLog {
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
    deviceType: (["mobile", "tablet", "desktop", "unknown"].includes(d.deviceType as string)
      ? (d.deviceType as ColorizationLog["deviceType"])
      : null),
    createdAt: ts(d.createdAt) ?? new Date(0).toISOString(),
  };
}

export function mapAudit(id: string, d: Record<string, unknown>): AdminAuditLog {
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
  const doc = await getDoc(COLLECTIONS.members, uid);
  if (!doc) return null;
  return mapMember(doc.id, doc.data);
}

export async function findMemberByEmail(emailLower: string): Promise<Member | null> {
  const docs = await runQuery({
    collectionId: COLLECTIONS.members,
    where: [{ field: "emailLower", op: "EQUAL", value: emailLower }],
    limit: 1,
  });
  if (docs.length === 0) return null;
  return mapMember(docs[0].id, docs[0].data);
}

export async function touchLastLogin(uid: string): Promise<void> {
  await commitWrites([
    {
      kind: "set",
      collectionId: COLLECTIONS.members,
      docId: uid,
      data: { lastLoginAt: serverTimestamp() },
      merge: true,
    },
  ]);
}
