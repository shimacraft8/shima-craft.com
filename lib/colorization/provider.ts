import type { ColorizationProvider } from "@/lib/colorization/types";
import { ReplicateColorizationProvider } from "@/lib/colorization/replicate";

/**
 * カラー化エンジンの取得口。将来 Replicate から自前DDColor APIへ切り替える際は
 * ここで返す実装を差し替えるだけでよい（Route Handler側の変更は不要）。
 */
export function getColorizationProvider(): ColorizationProvider {
  return new ReplicateColorizationProvider();
}
