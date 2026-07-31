import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const commitWritesMock = vi.fn();
const getDocMock = vi.fn();
const newDocIdMock = vi.fn();

vi.mock("@/lib/firebase/rest/firestore", () => ({
  commitWrites: (...args: unknown[]) => commitWritesMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  newDocId: (...args: unknown[]) => newDocIdMock(...args),
}));

beforeEach(() => {
  vi.resetModules();
  commitWritesMock.mockReset().mockResolvedValue(undefined);
  getDocMock.mockReset();
  newDocIdMock.mockReset().mockReturnValue("exec-1");
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("createExecution", () => {
  it("generates the execution id client-side and commits both docs atomically", async () => {
    const { createExecution } = await import("../executions");
    const executionId = await createExecution("uid-1", { inputWidth: 100, inputHeight: 200 });

    expect(executionId).toBe("exec-1");
    expect(commitWritesMock).toHaveBeenCalledTimes(1);
    const [ops] = commitWritesMock.mock.calls[0] as [Array<Record<string, unknown>>];
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ kind: "set", collectionId: "colorizationExecutions", docId: "exec-1" });
    expect((ops[0].data as Record<string, unknown>).userId).toBe("uid-1");
    expect((ops[0].data as Record<string, unknown>).status).toBe("started");
    expect(ops[1]).toMatchObject({ kind: "set", collectionId: "colorizationLogs" });
    expect((ops[1].data as Record<string, unknown>).eventType).toBe("colorize_started");
  });

  it("defaults optional metadata fields to null", async () => {
    const { createExecution } = await import("../executions");
    await createExecution("uid-1", {});
    const [ops] = commitWritesMock.mock.calls[0] as [Array<{ data: Record<string, unknown> }>];
    expect(ops[0].data.inputWidth).toBeNull();
    expect(ops[0].data.clientRequestId).toBeNull();
    expect(ops[0].data.retryOfExecutionId).toBeNull();
  });
});

describe("recordExecutionEvent", () => {
  it("throws when the execution does not exist", async () => {
    getDocMock.mockResolvedValue(null);
    const { recordExecutionEvent, ExecutionAccessError } = await import("../executions");
    await expect(recordExecutionEvent("uid-1", { executionId: "exec-1", eventType: "colorize_succeeded" })).rejects.toBeInstanceOf(
      ExecutionAccessError
    );
  });

  it("throws (IDOR guard) when the execution belongs to a different user", async () => {
    getDocMock.mockResolvedValue({ id: "exec-1", data: { userId: "someone-else" } });
    const { recordExecutionEvent, ExecutionAccessError } = await import("../executions");
    await expect(
      recordExecutionEvent("uid-1", { executionId: "exec-1", eventType: "colorize_succeeded" })
    ).rejects.toThrow(ExecutionAccessError);
    expect(commitWritesMock).not.toHaveBeenCalled();
  });

  it("a non-terminal event does not set status/completedAt on the execution", async () => {
    getDocMock.mockResolvedValue({ id: "exec-1", data: { userId: "uid-1" } });
    const { recordExecutionEvent } = await import("../executions");
    await recordExecutionEvent("uid-1", { executionId: "exec-1", eventType: "model_download_started" });
    const [ops] = commitWritesMock.mock.calls[0] as [Array<{ collectionId: string; data: Record<string, unknown> }>];
    const execUpdate = ops.find((o) => o.collectionId === "colorizationExecutions")!;
    expect(execUpdate.data.status).toBeUndefined();
    expect(execUpdate.data.completedAt).toBeUndefined();
  });

  it("a terminal event (colorize_succeeded) sets status/completedAt and optional output fields", async () => {
    getDocMock.mockResolvedValue({ id: "exec-1", data: { userId: "uid-1" } });
    const { recordExecutionEvent } = await import("../executions");
    await recordExecutionEvent("uid-1", {
      executionId: "exec-1",
      eventType: "colorize_succeeded",
      processingMode: "webgpu",
      outputWidth: 100,
      outputHeight: 200,
      durationMs: 500,
    });
    const [ops] = commitWritesMock.mock.calls[0] as [Array<{ collectionId: string; data: Record<string, unknown> }>];
    const execUpdate = ops.find((o) => o.collectionId === "colorizationExecutions")!;
    expect(execUpdate.data.status).toBe("succeeded");
    expect(execUpdate.data.completedAt).toBeDefined();
    expect(execUpdate.data.processingMode).toBe("webgpu");
    expect(execUpdate.data.outputWidth).toBe(100);
  });

  it("colorize_succeeded additionally updates the member's lastUsedAt (3 ops total)", async () => {
    getDocMock.mockResolvedValue({ id: "exec-1", data: { userId: "uid-1" } });
    const { recordExecutionEvent } = await import("../executions");
    await recordExecutionEvent("uid-1", { executionId: "exec-1", eventType: "colorize_succeeded" });
    const [ops] = commitWritesMock.mock.calls[0] as [Array<{ collectionId: string; docId: string; merge?: boolean }>];
    expect(ops).toHaveLength(3);
    const memberOp = ops.find((o) => o.collectionId === "members")!;
    expect(memberOp.docId).toBe("uid-1");
    expect(memberOp.merge).toBe(true);
  });

  it("a non-succeeded event does not touch the member doc (2 ops total)", async () => {
    getDocMock.mockResolvedValue({ id: "exec-1", data: { userId: "uid-1" } });
    const { recordExecutionEvent } = await import("../executions");
    await recordExecutionEvent("uid-1", { executionId: "exec-1", eventType: "colorize_failed", errorCode: "OOM" });
    const [ops] = commitWritesMock.mock.calls[0] as [Array<{ collectionId: string }>];
    expect(ops).toHaveLength(2);
    expect(ops.some((o) => o.collectionId === "members")).toBe(false);
  });

  it("download_clicked sets downloadClickedAt without marking the execution terminal", async () => {
    getDocMock.mockResolvedValue({ id: "exec-1", data: { userId: "uid-1" } });
    const { recordExecutionEvent } = await import("../executions");
    await recordExecutionEvent("uid-1", { executionId: "exec-1", eventType: "download_clicked" });
    const [ops] = commitWritesMock.mock.calls[0] as [Array<{ collectionId: string; data: Record<string, unknown> }>];
    const execUpdate = ops.find((o) => o.collectionId === "colorizationExecutions")!;
    expect(execUpdate.data.downloadClickedAt).toBeDefined();
    expect(execUpdate.data.status).toBeUndefined();
  });

  it("uses a deterministic log document id derived from executionId+eventType (idempotent)", async () => {
    getDocMock.mockResolvedValue({ id: "exec-1", data: { userId: "uid-1" } });
    const { recordExecutionEvent } = await import("../executions");
    const { logDocId } = await import("../tokens");
    await recordExecutionEvent("uid-1", { executionId: "exec-1", eventType: "colorize_started" });
    const [ops] = commitWritesMock.mock.calls[0] as [Array<{ collectionId: string; docId: string }>];
    const logOp = ops.find((o) => o.collectionId === "colorizationLogs")!;
    expect(logOp.docId).toBe(logDocId("exec-1", "colorize_started"));
  });
});
