import { defineConfig } from "vitest/config";
import path from "path";

/**
 * RLS統合テスト用設定。ローカルSupabase（supabase start）が必要なため、
 * 通常の `npx vitest run` には含めず、`npm run test:rls` で明示的に実行する。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
