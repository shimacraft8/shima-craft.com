import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "./repo";
import { logDocId } from "./tokens";
import type { ColorizeLogEventType, ProcessingMode } from "./types";

/**
 * カラー化の実行許可(execution)発行と、イベント記録。
 * - executionId はサーバー生成（クライアントから受け取らない）
 * - userId はセッション由来のみ（なりすまし・偽造防止）
 * - timestamp は server timestamp（client時刻を信用しない）
 * - 画像・ファイル名は一切受け取らない
 */

export type ExecutionMeta = {
  inputWidth?: number | null;
  inputHeight?: number | null;
  inputFileSize?: number | null;
  clientRequestId?: string | null;
  retryOfExecutionId?: string | null;
};

export async function createExecution(uid: string, meta: ExecutionMeta): Promise<string> {
  const db = adminDb();
  const execRef = db.collection(COLLECTIONS.executions).doc();
  const executionId = execRef.id;

  const batch = db.batch();
  batch.set(execRef, {
    userId: uid,
    status: "started",
    processingMode: null,
    inputWidth: meta.inputWidth ?? null,
    inputHeight: meta.inputHeight ?? null,
    inputFileSize: meta.inputFileSize ?? null,
    outputWidth: null,
    outputHeight: null,
    durationMs: null,
    errorCode: null,
    clientRequestId: meta.clientRequestId ?? null,
    retryOfExecutionId: meta.retryOfExecutionId ?? null,
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
    downloadClickedAt: null,
  });

  const startedLogRef = db.collection(COLLECTIONS.logs).doc(logDocId(executionId, "colorize_started"));
  batch.set(startedLogRef, {
    userId: uid,
    executionId,
    eventType: "colorize_started",
    status: "started",
    processingMode: null,
    imageWidth: meta.inputWidth ?? null,
    imageHeight: meta.inputHeight ?? null,
    durationMs: null,
    errorCode: null,
    browserName: null,
    deviceType: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return executionId;
}

export class ExecutionAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionAccessError";
  }
}

export type RecordEventInput = {
  executionId: string;
  eventType: ColorizeLogEventType;
  status?: string;
  processingMode?: ProcessingMode | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  outputWidth?: number | null;
  outputHeight?: number | null;
  durationMs?: number | null;
  errorCode?: string | null;
  browserName?: string | null;
  deviceType?: "mobile" | "tablet" | "desktop" | "unknown" | null;
};

const TERMINAL_STATUS: Record<string, "succeeded" | "failed" | "cancelled"> = {
  colorize_succeeded: "succeeded",
  colorize_failed: "failed",
  colorize_cancelled: "cancelled",
};

/**
 * イベントを記録する。
 * - executionが同じuserIdに属することを確認（IDOR防止）
 * - logDocId による決定論的idで二重記録防止（idempotent）
 * - executionの終端状態・ダウンロード時刻も更新
 */
export async function recordExecutionEvent(uid: string, input: RecordEventInput): Promise<void> {
  const db = adminDb();
  const execRef = db.collection(COLLECTIONS.executions).doc(input.executionId);
  const execSnap = await execRef.get();
  if (!execSnap.exists) throw new ExecutionAccessError("execution not found");
  if (execSnap.data()!.userId !== uid) throw new ExecutionAccessError("forbidden");

  const logRef = db
    .collection(COLLECTIONS.logs)
    .doc(logDocId(input.executionId, input.eventType));

  const batch = db.batch();
  batch.set(logRef, {
    userId: uid,
    executionId: input.executionId,
    eventType: input.eventType,
    status: input.status ?? "",
    processingMode: input.processingMode ?? null,
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    durationMs: input.durationMs ?? null,
    errorCode: input.errorCode ?? null,
    browserName: input.browserName ?? null,
    deviceType: input.deviceType ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  const execUpdate: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  const terminal = TERMINAL_STATUS[input.eventType];
  if (terminal) {
    execUpdate.status = terminal;
    execUpdate.completedAt = FieldValue.serverTimestamp();
    if (input.processingMode) execUpdate.processingMode = input.processingMode;
    if (input.outputWidth != null) execUpdate.outputWidth = input.outputWidth;
    if (input.outputHeight != null) execUpdate.outputHeight = input.outputHeight;
    if (input.durationMs != null) execUpdate.durationMs = input.durationMs;
    if (input.errorCode) execUpdate.errorCode = input.errorCode;
  }
  if (input.eventType === "download_clicked") {
    execUpdate.downloadClickedAt = FieldValue.serverTimestamp();
  }
  if (input.eventType === "colorize_succeeded") {
    // memberの最終利用日時を更新
    batch.set(
      db.collection(COLLECTIONS.members).doc(uid),
      { lastUsedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
  batch.set(execRef, execUpdate, { merge: true });

  await batch.commit();
}
