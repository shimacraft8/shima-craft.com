"use client";

import { type FormEvent, useState } from "react";
import styles from "./monitor.module.css";

type Step = "input" | "confirm" | "complete";

type FormData = {
  name: string;
  business: string;
  url: string;
  issue: string;
  email: string;
  area: string;
  deadline: string;
};

const LABELS: [keyof FormData, string][] = [
  ["name", "お名前"],
  ["business", "店名・事業名"],
  ["url", "Googleマップ・HP・SNSのURL"],
  ["issue", "希望内容・現在の課題"],
  ["email", "返信先メールアドレス"],
  ["area", "所在地・対応地域"],
  ["deadline", "希望時期"],
];

export function MonitorForm() {
  const [step, setStep] = useState<Step>("input");
  const [data, setData] = useState<FormData>({
    name: "", business: "", url: "", issue: "", email: "", area: "", deadline: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleInput(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const get = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement).value.trim();
    setData({
      name: get("name"),
      business: get("business"),
      url: get("url"),
      issue: get("issue"),
      email: get("email"),
      area: get("area"),
      deadline: get("deadline"),
    });
    setStep("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: { ok: boolean } = await res.json();
      if (!json.ok) {
        setError("送信に失敗しました。お手数ですが直接メールでご連絡ください。");
        setSending(false);
        return;
      }
      if (typeof window !== "undefined" && typeof (window as { gtag?: unknown }).gtag === "function") {
        (window as { gtag: (e: string, n: string, p: object) => void }).gtag(
          "event", "monitor_form_submit", { link_location: "monitor_page" }
        );
      }
      setStep("complete");
    } catch {
      setError("送信に失敗しました。お手数ですが直接メールでご連絡ください。");
      setSending(false);
    }
  }

  if (step === "complete") {
    return (
      <div className={styles.complete}>
        <div className={styles.completeIcon}>✓</div>
        <p className={styles.completeTitle}>お申し込みを受け付けました</p>
        <p className={styles.completeSub}>完了しました。折り返しをお待ちください。</p>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className={styles.confirm}>
        <p className={styles.confirmNote}>以下の内容で送信します。内容をご確認ください。</p>
        <dl className={styles.confirmTable}>
          {LABELS.map(([key, label]) =>
            data[key] ? (
              <div key={key} className={styles.confirmRow}>
                <dt>{label}</dt>
                <dd>{data[key]}</dd>
              </div>
            ) : null
          )}
        </dl>
        <p className={styles.confirmAgree}>モニター条件（事例掲載・感想・数値確認への協力）と料金55,000円（税込）を確認のうえ送信します。</p>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.confirmActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnOutline}`}
            onClick={() => { setStep("input"); setError(null); }}
          >
            編集に戻る
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.submit}`}
            onClick={handleSubmit}
            disabled={sending}
          >
            {sending ? "送信中…" : "この内容で送信する"}
          </button>
        </div>
        <p className={styles.contactAlt}>
          直接送る場合：
          <a href="mailto:shimacraft8@gmail.com">shimacraft8@gmail.com</a>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleInput}>
      <div className={styles.field}>
        <label htmlFor="m-name">お名前（必須）</label>
        <input id="m-name" name="name" required placeholder="例：山田 太郎" defaultValue={data.name} />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-business">店名・事業名（必須）</label>
        <input id="m-business" name="business" required placeholder="例：○○商店／○○サービス" defaultValue={data.business} />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-url">Googleマップ・ホームページ・SNSのURL（任意）</label>
        <input id="m-url" name="url" type="url" placeholder="分かるものを1つ" defaultValue={data.url} />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-issue">希望する内容・現在の課題（必須）</label>
        <textarea
          id="m-issue"
          name="issue"
          required
          placeholder="例：Googleマップを整えたい、紹介ページがほしい、問い合わせ先を分かりやすくしたい など"
          defaultValue={data.issue}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-email">返信先メールアドレス（必須）</label>
        <input id="m-email" name="email" type="email" required placeholder="example@example.com" defaultValue={data.email} />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-area">所在地・対応地域（必須）</label>
        <input id="m-area" name="area" required placeholder="例：鹿児島県奄美市／全国オンライン" defaultValue={data.area} />
      </div>
      <div className={styles.field}>
        <label htmlFor="m-deadline">希望時期（任意）</label>
        <input id="m-deadline" name="deadline" placeholder="例：8月中、急ぎではない" defaultValue={data.deadline} />
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
      <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${styles.submit}`}>
        確認画面へ
      </button>
      <p className={styles.formNote}>
        次の画面で入力内容をご確認いただいてから送信されます。
      </p>
      <p className={styles.contactAlt}>
        直接送る場合：
        <a href="mailto:shimacraft8@gmail.com">shimacraft8@gmail.com</a>
      </p>
    </form>
  );
}
