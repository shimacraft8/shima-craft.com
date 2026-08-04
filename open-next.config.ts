import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
// R2はこのCloudflareアカウントで有効化しない方針のため、ISR/revalidateの
// incremental cacheはKVバックエンドを使う（R2版と同じOpenNext公式実装の切替のみ）。
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
	incrementalCache: kvIncrementalCache,
});
