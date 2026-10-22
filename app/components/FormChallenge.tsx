"use client";
import Script from "next/script";
import { mailtoHref } from "@/app/lib/site";
import { useEffect, useRef, useState } from "react";
type API = { render: (el: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
export function FormChallenge({ action, onToken, resetKey = 0 }: { action: string; onToken: (token: string) => void; resetKey?: number }) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const el = useRef<HTMLDivElement>(null), callback = useRef(onToken);
  callback.current = onToken;
  const [ready, setReady] = useState(false), [error, setError] = useState(false);
  useEffect(() => {
    const api = (window as Window & { turnstile?: API }).turnstile;
    if (!ready || !sitekey || !el.current || !api) return;
    callback.current(""); setError(false);
    const id = api.render(el.current, { sitekey, action, theme: "auto", size: "flexible",
      callback: (token: string) => { setError(false); callback.current(token); },
      "expired-callback": () => callback.current(""),
      "error-callback": () => { setError(true); callback.current(""); },
    });
    return () => { api.remove(id); callback.current(""); };
  }, [ready, sitekey, action, resetKey]);
  if (!sitekey) return <p role="status">フォームは現在準備中です。<a href={mailtoHref}>メールでご連絡ください。</a></p>;
  return <div>
    <Script id="form-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setError(true)} />
    <div ref={el} aria-label="送信前の安全確認" />
    {error && <p role="alert">安全確認を完了できませんでした。接続を確認して再読み込みするか、<a href={mailtoHref}>メールでご連絡ください。</a></p>}
  </div>;
}
