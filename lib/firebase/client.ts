"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from "firebase/auth";

/**
 * Firebase クライアントSDK（Authenticationのみ）。
 * Web設定値は公開情報だが、環境ごとに Vercel env で管理する。
 * ここでは Firestore クライアントSDKを一切初期化しない
 * （ブラウザからのFirestore直接アクセスを構造的に不可能にする）。
 */

let cachedApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
  cachedApp = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/** Googleログインを実行し、ID Token を返す。 */
export async function signInWithGoogle(): Promise<{ idToken: string; email: string | null }> {
  const auth = getFirebaseAuth();
  auth.languageCode = "ja";
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred: UserCredential = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  return { idToken, email: cred.user.email };
}

/** クライアント側のFirebase認証状態を破棄する（サーバーのSession Cookie削除とは別）。 */
export async function signOutClient(): Promise<void> {
  await getFirebaseAuth().signOut();
}
