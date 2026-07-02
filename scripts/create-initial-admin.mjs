/**
 * 初期管理者を作成する（idempotent: 何度実行しても重複しない）。
 *
 * 使い方:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   INITIAL_ADMIN_EMAIL=... \
 *   [INITIAL_ADMIN_PASSWORD=...]  # ローカル検証用。本番では未指定にして招待メールを送る
 *   [SITE_URL=https://shima-craft.com]
 *   node scripts/create-initial-admin.mjs
 *
 * - メールアドレスはソースコードに直書きせず環境変数で渡す
 * - パスワード・キーはログへ出力しない
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.INITIAL_ADMIN_EMAIL;
const password = process.env.INITIAL_ADMIN_PASSWORD; // 任意（ローカル用）
const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

if (!url || !serviceKey || !email) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / INITIAL_ADMIN_EMAIL を設定してください");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: existing, error: findErr } = await admin
  .from("profiles")
  .select("id, email, role, account_status")
  .ilike("email", email)
  .maybeSingle();
if (findErr) {
  console.error("profiles照会に失敗:", findErr.message);
  process.exit(1);
}

let userId = existing?.id;

if (!userId) {
  if (password) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      console.error("ユーザー作成に失敗:", error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log("ユーザーを作成しました（パスワード指定・メール送信なし）");
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
    });
    if (error) {
      console.error("招待メール送信に失敗:", error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log("招待メールを送信しました。メールのリンクからパスワードを設定してください");
  }
} else {
  console.log("既存ユーザーを管理者として設定します");
}

const { error: updErr } = await admin
  .from("profiles")
  .update({ role: "admin", account_status: "active", contract_status: "active" })
  .eq("id", userId);
if (updErr) {
  console.error("role更新に失敗:", updErr.message);
  process.exit(1);
}

await admin.from("admin_audit_logs").insert({
  admin_user_id: userId,
  action: "initial_admin_ensured",
  target_user_id: userId,
  after_data: { role: "admin", account_status: "active", contract_status: "active" },
  request_id: crypto.randomUUID(),
});

console.log("初期管理者の設定が完了しました:", email);
