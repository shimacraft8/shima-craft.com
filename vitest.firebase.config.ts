import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Firebase Emulator 統合テスト用設定。
 * scripts/run-firebase-tests.sh 経由で（emulator起動済みの状態で）実行する。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "test-stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/firebase/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
