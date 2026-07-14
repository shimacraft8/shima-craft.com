"use client";

import type { FormEvent } from "react";
import styles from "./monitor.module.css";

export function MonitorForm() {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const get = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement).value.trim();

    const name = get("name");
    const business = get("business");
    const url = get("url");
    const issue = get("issue");
    const email = get("email");
    const area = get("area");
    const deadline = get("deadline");

    const subject = encodeURIComponent("モニター申込｜" + business);
    const body = encodeURIComponent(
      "お名前：" + name + "\n" +
      "店名・事業名：" + business + "\n" +
      "URL：" + (url || "未記入") + "\n" +
      "希望内容・課題：\n" + issue + "\n\n" +
      "所在地・対応地域：" + area + "\n" +
      "希望時期：" + (deadline || "未記入") + "\n" +
      "返信先：" + email + "\n" +
      "モニター条件・料金確認：同意済み"
    );

    if (typeof window !== "undefined" && typeof (window as { gtag?: unknown }).gtag === "function") {
      (window as { gtag: (e: string, n: string, p: object) => void }).gtag(
        "event", "monitor_form_submit", { link_location: "monitor_page" }
      );
    }

    const mailto = "mailto:shimacraft8@gmail.com?subject=" + subject + "&body=" + body;
    const a = document.createElement("a");
    a.href = mailto;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="m-name">お名前（必須）</label>
        <input id="m-name" name="name" required placeholder="例：山田 太郎" />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-business">店名・事業名（必須）</label>
        <input id="m-business" name="business" required placeholder="例：○○商店／○○サービス" />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-url">Googleマップ・ホームページ・SNSのURL（任意）</label>
        <input id="m-url" name="url" type="url" placeholder="分かるものを1つ" />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-issue">希望する内容・現在の課題（必須）</label>
        <textarea
          id="m-issue"
          name="issue"
          required
          placeholder="例：Googleマップを整えたい、紹介ページがほしい、問い合わせ先を分かりやすくしたい など"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-email">返信先メールアドレス（必須）</label>
        <input id="m-email" name="email" type="email" required placeholder="example@example.com" />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-area">所在地・対応地域（必須）</label>
        <input id="m-area" name="area" required placeholder="例：鹿児島県奄美市／全国オンライン" />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-deadline">希望時期（任意）</label>
        <input id="m-deadline" name="deadline" placeholder="例：8月中、急ぎではない" />
      </div>
      <div className={styles.field}>
        <label>
          <input
            name="agree"
            type="checkbox"
            required
            style={{ width: "auto", marginRight: "8px" }}
          />
          モニター条件（事例掲載・感想・数値確認への協力）と、料金55,000円（税込）を確認しました
        </label>
      </div>
      <button
        type="submit"
        className={`${styles.btn} ${styles.btnPrimary} ${styles.submit}`}
      >
        今すぐ申し込む
      </button>
      <p className={styles.formNote}>
        送信ボタンを押すと、入力内容を入れたメール作成画面が開きます。メール送信後、受付確認の返信をもって申し込み受付となります。
      </p>
      <p className={styles.contactAlt}>
        直接送る場合：
        <a href="mailto:shimacraft8@gmail.com">shimacraft8@gmail.com</a>
      </p>
    </form>
  );
}
