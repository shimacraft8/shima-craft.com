"use server";

import { redirect } from "next/navigation";
import { revokeAllRefreshTokens } from "@/lib/firebase/rest/authAdmin";
import { clearSessionCookieOnStore, getVerifiedSession } from "@/lib/auth/session";

/**
 * ログアウト（Server Action）。
 * Session Cookieを削除し、refresh tokenを失効させて他タブ・他端末でも無効化する。
 */
export async function signOutAction(): Promise<void> {
  try {
    const decoded = await getVerifiedSession();
    if (decoded) {
      await revokeAllRefreshTokens(decoded.uid).catch(() => {});
    }
  } finally {
    clearSessionCookieOnStore();
  }
  redirect("/login");
}
