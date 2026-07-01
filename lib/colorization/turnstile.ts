const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid_token" | "network_error" };

/**
 * Cloudflare Turnstile の Siteverify API でトークンをサーバー側検証する。
 * TURNSTILE_SECRET_KEY が未設定の場合は必ず失敗として扱う（無防備な実行を許さない）。
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp: string,
  fetchImpl: typeof fetch = fetch
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, reason: "not_configured" };
  }
  if (!token) {
    return { ok: false, reason: "invalid_token" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return { ok: false, reason: "network_error" };
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? { ok: true } : { ok: false, reason: "invalid_token" };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
