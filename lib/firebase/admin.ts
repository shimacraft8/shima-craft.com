import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK の初期化（サーバー専用）。
 * - `server-only` によりクライアントバンドルへ混入するとビルドが失敗する。
 * - 認証情報は環境変数から読む。FIREBASE_PRIVATE_KEY の改行(\n)を復元する。
 * - Firestore Emulator を使う場合は FIRESTORE_EMULATOR_HOST が自動で参照される。
 */

let cached: { app: App; auth: Auth; db: Firestore } | null = null;

function normalizePrivateKey(raw: string): string {
  // Vercel等に貼り付けると改行が \n エスケープされることがあるため復元する。
  // 前後のダブルクォートも取り除く。
  const unquoted = raw.replace(/^"([\s\S]*)"$/, "$1");
  return unquoted.includes("\\n") ? unquoted.replace(/\\n/g, "\n") : unquoted;
}

function init(): { app: App; auth: Auth; db: Firestore } {
  if (cached) return cached;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is not configured");
  }

  const existing = getApps();
  let app: App;
  if (existing.length > 0) {
    app = existing[0];
  } else if (useEmulator) {
    // Emulator利用時はサービスアカウント鍵不要（projectIdのみ）
    app = initializeApp({ projectId });
  } else {
    if (!clientEmail || !privateKeyRaw) {
      throw new Error("Firebase service account credentials are not configured");
    }
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: normalizePrivateKey(privateKeyRaw),
      }),
    });
  }

  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // 既に初期化済みの場合は無視
  }

  cached = { app, auth: getAuth(app), db };
  return cached;
}

export function adminAuth(): Auth {
  return init().auth;
}

export function adminDb(): Firestore {
  return init().db;
}
