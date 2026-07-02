import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service Role クライアント（RLSをバイパスする管理用）。
 * - このモジュールは `server-only` のため、クライアントバンドルへ混入するとビルドが失敗する。
 * - 呼び出し側は必ず認可チェック（requireAdmin等）を済ませてから使うこと。
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
