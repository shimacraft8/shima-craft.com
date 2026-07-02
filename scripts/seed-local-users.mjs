/**
 * ローカル検証用ユーザーのシード（本番では使用しない）。
 * admin 1名 + 状態別テストユーザー3名を idempotent に作成する。
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD || "local-test-pass-123456";

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定してください");
  process.exit(1);
}
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  console.error("このスクリプトはローカルSupabase専用です:", url);
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const USERS = [
  { email: "admin@example.com", display_name: "管理者テスト", role: "admin", account_status: "active", contract_status: "active" },
  { email: "user-active@example.com", display_name: "有効ユーザー", role: "user", account_status: "active", contract_status: "active" },
  { email: "user-suspended@example.com", display_name: "停止ユーザー", role: "user", account_status: "suspended", contract_status: "active" },
  { email: "user-unpaid@example.com", display_name: "未払いユーザー", role: "user", account_status: "active", contract_status: "unpaid" },
];

for (const u of USERS) {
  const { data: existing } = await admin.from("profiles").select("id").ilike("email", u.email).maybeSingle();
  let id = existing?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error("作成失敗:", u.email, error.message);
      process.exit(1);
    }
    id = data.user.id;
  }
  const { error: updErr } = await admin
    .from("profiles")
    .update({
      display_name: u.display_name,
      role: u.role,
      account_status: u.account_status,
      contract_status: u.contract_status,
    })
    .eq("id", id);
  if (updErr) {
    console.error("更新失敗:", u.email, updErr.message);
    process.exit(1);
  }
  console.log("ok:", u.email, u.role, u.account_status, u.contract_status);
}
console.log("シード完了");
