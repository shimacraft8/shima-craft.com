import "server-only";

/**
 * Firebase Admin（サービスアカウント資格情報）が利用可能な環境変数を持つか。
 * 未設定の環境（Firebaseプロジェクト構築前のデプロイ等）では、
 * 呼び出し側が「未ログイン扱い」へ安全に縮退できるようにするための判定。
 *
 * 意図的に firebase-admin/lib/firebase/admin.ts から分離した独立ファイル。
 * admin.ts はfirebase-admin/app・auth・firestoreを静的importしており、
 * それらのimportだけでCloudflare Workers上ではモジュール評価時にprotobufjsの
 * eval制限エラーが発生する（実際に呼び出すかどうかは無関係）。
 * この関数は環境変数の存在確認のみで firebase-admin に依存しないため、
 * ここに置くことでCloudflare対応済みのセッション層（lib/auth/session.ts）から
 * 安全に使える。
 */
export function isAdminConfigured(): boolean {
  if (process.env.FIRESTORE_EMULATOR_HOST) return Boolean(process.env.FIREBASE_PROJECT_ID);
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}
