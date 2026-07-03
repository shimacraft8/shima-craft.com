/**
 * Firestore Security Rules（deny-all）の検証。
 * @firebase/rules-unit-testing で firestore.rules を明示的にロードし、
 * クライアントSDK相当のアクセスがすべて拒否されることを確認する。
 * サーバー(Admin SDK)はRulesをバイパスするため、これはクライアント直アクセス遮断の確認。
 */
import { readFileSync } from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const [h, p] = host.split(":");
  testEnv = await initializeTestEnvironment({
    projectId: process.env.FIREBASE_PROJECT_ID || "shima-craft-members-test",
    firestore: {
      rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
      host: h,
      port: Number(p),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("Firestore deny-all（クライアントSDK直アクセス遮断）", () => {
  it("未認証クライアントは members を読めない", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "members", "any-uid")));
  });

  it("未認証クライアントは members に書けない", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "members", "any-uid"), { role: "admin" }));
  });

  it("認証済みでも他人・自分のmemberを直接書き換えできない", async () => {
    const db = testEnv.authenticatedContext("attacker").firestore();
    await assertFails(setDoc(doc(db, "members", "attacker"), { role: "admin", accountStatus: "active" }));
    await assertFails(getDoc(doc(db, "members", "victim")));
  });

  it("認証済みでも colorizationLogs を一覧取得・偽造insertできない", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(getDocs(collection(db, "colorizationLogs")));
    await assertFails(setDoc(doc(db, "colorizationLogs", "forged"), { userId: "u1", eventType: "colorize_succeeded" }));
  });

  it("認証済みでも adminAuditLogs / invitations / trial系 を読めない", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(getDocs(collection(db, "adminAuditLogs")));
    await assertFails(getDocs(collection(db, "invitations")));
    await assertFails(getDocs(collection(db, "colorizationExecutions")));
  });
});
