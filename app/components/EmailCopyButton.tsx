"use client";

import { useState } from "react";

import { site } from "@/app/lib/site";

import styles from "@/app/blog/blog.module.css";

export function EmailCopyButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック不要：ブラウザがClipboard APIに対応していない場合はボタン非表示でも可
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={copied ? styles.copyBtnDone : styles.copyBtn}
      aria-label="メールアドレスをコピー"
    >
      {copied ? "コピーしました" : "コピー"}
    </button>
  );
}
