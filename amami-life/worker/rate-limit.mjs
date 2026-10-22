// Supplementary isolate-local ceiling; never described as a worldwide quota.
export function createPublicLimiter({ clock = () => Date.now(), limit = 240, maxKeys = 2048 } = {}) {
  const buckets = new Map();
  return async (request, env) => {
    const key = request.headers.get("cf-connecting-ip") || "local-shared";
    if (env.PUBLIC_API_RATE_LIMITER) {
      try {
        const result = await env.PUBLIC_API_RATE_LIMITER.limit({ key: "amami-life:public:" + key });
        return result.success ? null : new Response('{"error":"rate-limit"}', { status: 429, headers: { "Content-Type":"application/json", "Cache-Control":"no-store", "Retry-After":"60" } });
      } catch { return new Response('{"error":"rate-limit-unavailable"}', { status: 503, headers: { "Content-Type":"application/json", "Cache-Control":"no-store", "Retry-After":"60" } }); }
    }
    const now = clock();
    for (const [id, entry] of buckets) if (entry.until <= now) buckets.delete(id);
    let entry = buckets.get(key);
    if (!entry) {
      if (buckets.size >= maxKeys) return new Response('{"error":"busy"}', { status: 503, headers: { "Cache-Control":"no-store", "Retry-After":"60" } });
      entry = { count: 0, until: now + 60_000 }; buckets.set(key, entry);
    }
    if (++entry.count > limit) return new Response('{"error":"rate-limit"}', { status: 429, headers: { "Content-Type":"application/json", "Cache-Control":"no-store", "Retry-After":"60" } });
    return null;
  };
}
