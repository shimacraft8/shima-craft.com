import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server Component / Server Action / Route Handler 用の Supabase クライアント。
 * anonキー + 利用者自身のセッションCookieで動作し、RLSが適用される。
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Componentからのset呼び出しは無視される（middlewareがセッション更新を担う）
          }
        },
      },
    }
  );
}
