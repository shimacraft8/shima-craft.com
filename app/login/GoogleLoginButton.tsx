"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, signOutClient } from "@/lib/firebase/client";

const REASON_FALLBACK = "ログインできませんでした。しばらくしてから再度お試しください。";

/**
 * Googleログインボタン。
 * 1. ブラウザでGoogle Sign-In → ID Token取得
 * 2. POST /api/auth/session（招待トークンがあれば同送）
 * 3. サーバーが会員/招待/初期adminを確認しSession Cookieを発行
 * 4. 成功時のみ next へ遷移
 * 未登録アカウントはサーバーが拒否し、クライアント側のFirebase認証状態も破棄する。
 */
export function GoogleLoginButton({
  next,
  invitationToken,
}: {
  next: string;
  invitationToken?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, invitationToken: invitationToken ?? null }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (res.ok && data?.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      // 未登録・停止などはサーバーで拒否。クライアントのFirebase認証も破棄する。
      await signOutClient().catch(() => {});
      setError(data?.message ?? REASON_FALLBACK);
    } catch (err) {
      // ポップアップを閉じた等
      const msg = err instanceof Error && /popup|cancel/i.test(err.message)
        ? "ログインがキャンセルされました。"
        : REASON_FALLBACK;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-google">
      <button
        type="button"
        className="btn auth-google-btn"
        onClick={handleClick}
        disabled={loading}
        aria-disabled={loading}
      >
        {loading ? "ログインしています…" : "Googleアカウントでログイン"}
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
