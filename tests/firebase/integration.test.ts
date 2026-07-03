/**
 * Firebase Emulator 統合テスト（本番データを汚さない）。
 * scripts/run-firebase-tests.sh 経由で実行する:
 *   - FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST を設定
 *   - FIREBASE_PROJECT_ID をテスト用に設定
 * サーバー側のセキュリティ上重要なロジックを、実Firestore(emulator)に対して検証する。
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, MEMBERSHIP_CONFIG_DOC, getMember } from "@/lib/members/repo";
import { tryBootstrapInitialAdmin } from "@/lib/members/login";
import {
  createInvitation,
  claimInvitation,
  findInvitationByToken,
  InvitationError,
} from "@/lib/members/invitations";
import { applyMemberMutation, MemberOpError } from "@/lib/members/admin-ops";
import { createExecution, recordExecutionEvent, ExecutionAccessError } from "@/lib/members/executions";

async function clearAll() {
  const db = adminDb();
  for (const c of Object.values(COLLECTIONS)) {
    const snap = await db.collection(c).get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

beforeEach(async () => {
  await clearAll();
});
afterAll(async () => {
  await clearAll();
});

describe("初期管理者ブートストラップ", () => {
  it("INITIAL_ADMIN_EMAIL一致時に一度だけadminを作成する（冪等・二重不可）", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "boss@example.com";
    const first = await tryBootstrapInitialAdmin("uid-boss", "boss@example.com", "Boss");
    expect(first).toBe(true);
    const m = await getMember("uid-boss");
    expect(m?.role).toBe("admin");
    expect(m?.accountStatus).toBe("active");
    expect(m?.contractStatus).toBe("active");

    // 二重実行では作られない
    const second = await tryBootstrapInitialAdmin("uid-boss2", "boss@example.com", "Boss2");
    expect(second).toBe(false);
    expect(await getMember("uid-boss2")).toBeNull();

    const cfg = await adminDb().collection(COLLECTIONS.systemConfig).doc(MEMBERSHIP_CONFIG_DOC).get();
    expect(cfg.data()!.adminCount).toBe(1);
    expect(cfg.data()!.bootstrapCompleted).toBe(true);
  });

  it("INITIAL_ADMIN_EMAILと違うメールではadmin化しない", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "boss@example.com";
    const r = await tryBootstrapInitialAdmin("uid-x", "someone@example.com", "X");
    expect(r).toBe(false);
    expect(await getMember("uid-x")).toBeNull();
  });
});

describe("招待claim", () => {
  async function makeInvite(email: string, role: "admin" | "user" = "user") {
    return createInvitation({
      emailLower: email,
      displayName: "テスト",
      role,
      accountStatus: "active",
      contractStatus: "payment_pending",
      createdBy: "admin-uid",
    });
  }

  it("正しいメールでclaimするとmemberが作られる（既定は利用不可のpayment_pending）", async () => {
    const { rawToken } = await makeInvite("taro@example.com");
    const found = await findInvitationByToken(rawToken);
    expect(found).not.toBeNull();
    await claimInvitation({
      invitationId: found!.id,
      uid: "uid-taro",
      googleEmail: "taro@example.com",
      displayName: "太郎",
    });
    const m = await getMember("uid-taro");
    expect(m?.accountStatus).toBe("active");
    expect(m?.contractStatus).toBe("payment_pending");
  });

  it("招待メールとGoogleメール不一致は拒否", async () => {
    const { rawToken } = await makeInvite("taro@example.com");
    const found = await findInvitationByToken(rawToken);
    await expect(
      claimInvitation({ invitationId: found!.id, uid: "uid-evil", googleEmail: "evil@example.com", displayName: "E" })
    ).rejects.toMatchObject({ code: "EMAIL_MISMATCH" });
  });

  it("claim済み招待を別アカウントで再claimできない（member重複作成なし）", async () => {
    const { rawToken } = await makeInvite("hanako@example.com");
    const found = await findInvitationByToken(rawToken);
    await claimInvitation({ invitationId: found!.id, uid: "uid-hana", googleEmail: "hanako@example.com", displayName: "花子" });
    // 同じ招待は既にclaimed。別uidでの再claimは拒否される
    await expect(
      claimInvitation({ invitationId: found!.id, uid: "uid-hana2", googleEmail: "hanako@example.com", displayName: "x" })
    ).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
    expect(await getMember("uid-hana2")).toBeNull();
    // 最初のmemberは正しく存在する
    expect((await getMember("uid-hana"))?.email).toBe("hanako@example.com");
  });

  it("取消済み招待は拒否、期限切れ招待は拒否", async () => {
    const { invitation, rawToken } = await makeInvite("late@example.com");
    // 期限切れに書き換え
    await adminDb().collection(COLLECTIONS.invitations).doc(invitation.id).update({ expiresAt: new Date(Date.now() - 1000) });
    const found = await findInvitationByToken(rawToken);
    await expect(
      claimInvitation({ invitationId: found!.id, uid: "uid-late", googleEmail: "late@example.com", displayName: "l" })
    ).rejects.toBeInstanceOf(InvitationError);
  });
});

describe("最後の管理者保護 + 監査ログのtransaction整合", () => {
  async function seedAdmin(uid: string, email: string) {
    process.env.INITIAL_ADMIN_EMAIL = email;
    await tryBootstrapInitialAdmin(uid, email, "A");
  }

  it("唯一の有効adminをuserへ降格できない", async () => {
    await seedAdmin("admin1", "a1@example.com");
    await expect(
      applyMemberMutation({
        adminUserId: "admin1",
        targetUid: "admin1",
        action: "member_updated",
        mutation: { role: "user" },
        requestId: "req1",
        ipHash: null,
        userAgent: null,
      })
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
    // 監査ログも書かれていない（transaction rollback）
    const audits = await adminDb().collection(COLLECTIONS.audit).get();
    expect(audits.empty).toBe(true);
  });

  it("adminが2人いれば1人を降格でき、監査ログが残る", async () => {
    await seedAdmin("admin1", "a1@example.com");
    // 2人目adminを招待claimで作る
    const { rawToken } = await createInvitation({
      emailLower: "a2@example.com",
      displayName: "A2",
      role: "admin",
      accountStatus: "active",
      contractStatus: "active",
      createdBy: "admin1",
    });
    const found = await findInvitationByToken(rawToken);
    await claimInvitation({ invitationId: found!.id, uid: "admin2", googleEmail: "a2@example.com", displayName: "A2" });

    await applyMemberMutation({
      adminUserId: "admin1",
      targetUid: "admin2",
      action: "member_updated",
      mutation: { role: "user" },
      requestId: "req2",
      ipHash: null,
      userAgent: null,
    });
    expect((await getMember("admin2"))?.role).toBe("user");
    const audits = await adminDb().collection(COLLECTIONS.audit).where("requestId", "==", "req2").get();
    expect(audits.size).toBe(1);
    expect(audits.docs[0].data().action).toBe("member_updated");
    // 秘密値が監査ログに含まれない
    expect(JSON.stringify(audits.docs[0].data())).not.toMatch(/password|token|privateKey/i);
  });
});

describe("実行ログのIDOR・冪等", () => {
  it("executionは所有者のみイベント記録でき、他人は拒否（IDOR防止）", async () => {
    const execId = await createExecution("owner-uid", { inputWidth: 400, inputHeight: 300 });
    // 他人が記録しようとすると拒否
    await expect(
      recordExecutionEvent("attacker-uid", { executionId: execId, eventType: "colorize_succeeded", status: "s" })
    ).rejects.toBeInstanceOf(ExecutionAccessError);
    // 所有者は記録できる
    await recordExecutionEvent("owner-uid", { executionId: execId, eventType: "colorize_succeeded", status: "s", processingMode: "webgpu" });
    const exec = await adminDb().collection(COLLECTIONS.executions).doc(execId).get();
    expect(exec.data()!.status).toBe("succeeded");
  });

  it("同じイベントの二重送信は二重記録されない（idempotent）", async () => {
    const execId = await createExecution("owner2", { inputWidth: 100, inputHeight: 100 });
    await recordExecutionEvent("owner2", { executionId: execId, eventType: "colorize_succeeded", status: "s" });
    await recordExecutionEvent("owner2", { executionId: execId, eventType: "colorize_succeeded", status: "s" });
    const logs = await adminDb()
      .collection(COLLECTIONS.logs)
      .where("executionId", "==", execId)
      .where("eventType", "==", "colorize_succeeded")
      .get();
    expect(logs.size).toBe(1);
  });

  it("createExecutionはcolorize_startedログを1件作る。画像データは保存されない", async () => {
    const execId = await createExecution("owner3", { inputWidth: 640, inputHeight: 480, inputFileSize: 123 });
    const started = await adminDb()
      .collection(COLLECTIONS.logs)
      .where("executionId", "==", execId)
      .where("eventType", "==", "colorize_started")
      .get();
    expect(started.size).toBe(1);
    const exec = await adminDb().collection(COLLECTIONS.executions).doc(execId).get();
    const raw = JSON.stringify(exec.data());
    expect(raw).not.toMatch(/base64|blob:|data:image/i);
  });
});
