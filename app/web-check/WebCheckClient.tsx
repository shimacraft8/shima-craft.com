"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/app/components/TrackedLink";
import {
  AnswerValue,
  CategoryKey,
  QUESTIONS,
  CATEGORY_NAMES,
  DiagnosisResult,
} from "./webCheckData";
import { getDiagnosisResult } from "./webCheckLogic";

type Phase = "intro" | "quiz" | "result" | "choice" | "form" | "declined" | "submitted";

const ANSWER_OPTIONS: { value: AnswerValue; label: string }[] = [
  { value: "yes", label: "はい" },
  { value: "no", label: "いいえ" },
  { value: "unknown", label: "分からない" },
];

interface FormValues {
  name: string;
  email: string;
  businessName: string;
  url: string;
  consent: boolean;
  honeypot: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  url?: string;
  consent?: string;
  general?: string;
}

// ─── 進捗バー ─────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="wc-progress" aria-hidden="true">
      <div className="wc-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── クイズセクション ──────────────────────────
function QuizSection({
  currentQ,
  answers,
  onAnswer,
  onBack,
  onNext,
}: {
  currentQ: number;
  answers: (AnswerValue | null)[];
  onAnswer: (v: AnswerValue) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const q = QUESTIONS[currentQ];
  const selected = answers[currentQ];
  const isLast = currentQ === QUESTIONS.length - 1;
  const legendId = useId();
  const questionRef = useRef<HTMLDivElement>(null);

  // 質問が変わったらフォーカス移動
  useEffect(() => {
    questionRef.current?.focus();
  }, [currentQ]);

  return (
    <div className="wc-quiz">
      <div
        ref={questionRef}
        className="wc-quiz-header"
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="wc-q-counter" aria-label={`質問 ${currentQ + 1} / ${QUESTIONS.length}`}>
          Q{currentQ + 1} / {QUESTIONS.length}
        </span>
        <ProgressBar current={currentQ} total={QUESTIONS.length} />
      </div>

      <fieldset className="wc-fieldset">
        <legend id={legendId} className="wc-legend">
          {q.text}
        </legend>
        <div className="wc-options" role="group" aria-labelledby={legendId}>
          {ANSWER_OPTIONS.map((opt) => {
            const id = `wc-opt-${currentQ}-${opt.value}`;
            const isChecked = selected === opt.value;
            return (
              <label
                key={opt.value}
                htmlFor={id}
                className={`wc-option${isChecked ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  id={id}
                  name={`q${currentQ}`}
                  value={opt.value}
                  checked={isChecked}
                  onChange={() => onAnswer(opt.value)}
                  className="wc-radio"
                />
                <span className="wc-option-check" aria-hidden="true" />
                <span className="wc-option-label">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="wc-nav">
        <button
          type="button"
          className="wc-btn-back"
          onClick={onBack}
          disabled={currentQ === 0}
          aria-disabled={currentQ === 0}
        >
          ← 戻る
        </button>
        <button
          type="button"
          className="wc-btn-next"
          onClick={onNext}
          disabled={selected === null}
          aria-disabled={selected === null}
        >
          {isLast ? "結果を見る" : "次へ →"}
        </button>
      </div>
    </div>
  );
}

// ─── 結果カード ────────────────────────────────
function ResultCard({
  rank,
  label,
  categoryKey,
}: {
  rank: "primary" | "secondary";
  label: string;
  categoryKey: CategoryKey;
}) {
  const isPrimary = rank === "primary";
  return (
    <div className={`wc-result-card wc-result-card--${rank}`}>
      <span className="wc-result-rank">
        {isPrimary ? "主な課題" : "あわせて見直したい項目"}
      </span>
      <span className="wc-result-category">{label}</span>
      <span className="wc-result-key" aria-hidden="true">{categoryKey}</span>
    </div>
  );
}

// ─── フォームセクション ────────────────────────
function FormSection({
  onSubmit,
  submitting,
  submitError,
  diagnosis,
}: {
  onSubmit: (values: FormValues) => Promise<void>;
  submitting: boolean;
  submitError: string | null;
  diagnosis: DiagnosisResult | null;
}) {
  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    businessName: "",
    url: "",
    consent: false,
    honeypot: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const firstErrorRef = useRef<HTMLInputElement | null>(null);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!values.name.trim()) e.name = "お名前を入力してください";
    else if (values.name.trim().length > 100)
      e.name = "お名前は100文字以内で入力してください";

    const email = values.email.trim();
    if (!email) e.email = "メールアドレスを入力してください";
    else if (email.length > 254) e.email = "メールアドレスが長すぎます";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "メールアドレスの形式を確認してください";

    const url = values.url.trim();
    if (url && url.length > 2048) e.url = "URLが長すぎます";
    else if (url && !/^https?:\/\/.+/.test(url))
      e.url = "URLは http:// または https:// から始めてください";

    if (!values.consent)
      e.consent = "プライバシーポリシーへの同意が必要です";

    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // 最初のエラー項目へフォーカス
      setTimeout(() => firstErrorRef.current?.focus(), 50);
      return;
    }
    await onSubmit(values);
  }

  const primaryLabel = diagnosis
    ? diagnosis.isAllZero
      ? "課題なし"
      : CATEGORY_NAMES[diagnosis.primary as CategoryKey]
    : "";

  const errKeys = Object.keys(errors) as Array<keyof FormErrors>;

  return (
    <div className="wc-form-wrap">
      <h2 className="wc-form-title">診断結果について相談する</h2>
      <p className="wc-form-note">
        診断結果（主な課題：<strong>{primaryLabel}</strong>
        ）をあわせてお送りします。相談は無料です。内容を確認後、メールでご連絡します。
      </p>

      {submitError && (
        <div className="wc-form-error-box" role="alert">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ハニーポット（スクリーンリーダー非表示・ボット向け罠） */}
        <div className="wc-honeypot" aria-hidden="true">
          <label htmlFor="wc-hp">Website</label>
          <input
            id="wc-hp"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={values.honeypot}
            onChange={(e) =>
              setValues((v) => ({ ...v, honeypot: e.target.value }))
            }
          />
        </div>

        <div className="wc-field">
          <label htmlFor="wc-name" className="wc-label">
            お名前 <span className="wc-required">必須</span>
          </label>
          <input
            id="wc-name"
            type="text"
            className={`wc-input${errors.name ? " error" : ""}`}
            autoComplete="name"
            maxLength={100}
            value={values.name}
            onChange={(e) =>
              setValues((v) => ({ ...v, name: e.target.value }))
            }
            aria-describedby={errors.name ? "wc-name-err" : undefined}
            aria-invalid={!!errors.name}
            ref={
              errKeys[0] === "name"
                ? (el) => {
                    firstErrorRef.current = el;
                  }
                : undefined
            }
          />
          {errors.name && (
            <span id="wc-name-err" className="wc-field-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        <div className="wc-field">
          <label htmlFor="wc-email" className="wc-label">
            メールアドレス <span className="wc-required">必須</span>
          </label>
          <input
            id="wc-email"
            type="email"
            className={`wc-input${errors.email ? " error" : ""}`}
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={values.email}
            onChange={(e) =>
              setValues((v) => ({ ...v, email: e.target.value }))
            }
            aria-describedby={errors.email ? "wc-email-err" : undefined}
            aria-invalid={!!errors.email}
            ref={
              errKeys[0] === "email"
                ? (el) => {
                    firstErrorRef.current = el;
                  }
                : undefined
            }
          />
          {errors.email && (
            <span id="wc-email-err" className="wc-field-error" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        <div className="wc-field">
          <label htmlFor="wc-biz" className="wc-label">
            事業名 <span className="wc-optional">任意</span>
          </label>
          <input
            id="wc-biz"
            type="text"
            className="wc-input"
            autoComplete="organization"
            maxLength={150}
            value={values.businessName}
            onChange={(e) =>
              setValues((v) => ({ ...v, businessName: e.target.value }))
            }
          />
        </div>

        <div className="wc-field">
          <label htmlFor="wc-url" className="wc-label">
            ホームページまたはInstagramのURL{" "}
            <span className="wc-optional">任意</span>
          </label>
          <input
            id="wc-url"
            type="url"
            className={`wc-input${errors.url ? " error" : ""}`}
            autoComplete="url"
            inputMode="url"
            maxLength={2048}
            placeholder="https://"
            value={values.url}
            onChange={(e) =>
              setValues((v) => ({ ...v, url: e.target.value }))
            }
            aria-describedby={errors.url ? "wc-url-err" : undefined}
            aria-invalid={!!errors.url}
          />
          {errors.url && (
            <span id="wc-url-err" className="wc-field-error" role="alert">
              {errors.url}
            </span>
          )}
        </div>

        <div className={`wc-field wc-consent${errors.consent ? " error" : ""}`}>
          <div className="wc-consent-label">
            <input
              id="wc-consent"
              type="checkbox"
              className="wc-checkbox"
              checked={values.consent}
              onChange={(e) =>
                setValues((v) => ({ ...v, consent: e.target.checked }))
              }
              aria-labelledby="wc-consent-label-text"
              aria-describedby={errors.consent ? "wc-consent-err" : undefined}
              aria-invalid={!!errors.consent}
            />
            <span id="wc-consent-label-text">
              <a
                href="/privacy"
                className="wc-pp-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                プライバシーポリシー
              </a>
              に同意して送信します
            </span>
          </div>
          {errors.consent && (
            <span
              id="wc-consent-err"
              className="wc-field-error"
              role="alert"
            >
              {errors.consent}
            </span>
          )}
          <p id="privacy-note" className="wc-privacy-note">
            入力いただいた情報は、ご相談への回答および必要なご連絡のためにのみ利用します。第三者への提供は行いません。
          </p>
        </div>

        <button
          type="submit"
          className="wc-submit-btn"
          disabled={submitting}
          aria-disabled={submitting}
        >
          {submitting ? "送信中…" : "診断結果を送って相談する"}
        </button>
      </form>
    </div>
  );
}

// ─── メインコンポーネント ───────────────────────
export function WebCheckClient() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(AnswerValue | null)[]>(
    Array(QUESTIONS.length).fill(null)
  );
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // フォームロード時刻（スパム判定用）
  const [formLoadTime] = useState<number>(() => Date.now());
  // 二重送信防止トークン
  const [submitToken] = useState<string>(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const resultRef = useRef<HTMLDivElement>(null);
  const choiceRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef<HTMLDivElement>(null);

  // フェーズが変わったらスクロール＆フォーカス
  useEffect(() => {
    if (phase === "result") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => resultRef.current?.focus(), 350);
    }
    if (phase === "choice") {
      choiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => choiceRef.current?.focus(), 350);
    }
    if (phase === "submitted" || phase === "declined") {
      submittedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => submittedRef.current?.focus(), 350);
    }
  }, [phase]);

  function handleStart() {
    trackEvent("web_check_start");
    setPhase("quiz");
  }

  function handleAnswer(value: AnswerValue) {
    trackEvent("web_check_answer", { question: currentQ + 1, answer: value });
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = value;
      return next;
    });
  }

  function handleBack() {
    if (currentQ > 0) setCurrentQ((q) => q - 1);
  }

  function handleNext() {
    if (answers[currentQ] === null) return;
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      // 全問完了 → 結果計算
      const validAnswers = answers as AnswerValue[];
      const result = getDiagnosisResult(validAnswers);
      setDiagnosis(result);

      trackEvent("web_check_complete", {
        primary: result.isAllZero ? "none" : result.primary,
      });
      trackEvent("web_check_result_view", {
        primary: result.isAllZero ? "none" : result.primary,
        secondary: result.secondary ?? "none",
      });

      setPhase("result");
    }
  }

  function handleConsultChoice(choice: "yes" | "no") {
    trackEvent("web_check_contact_select", { choice });
    if (choice === "yes") {
      setPhase("form");
    } else {
      setPhase("declined");
    }
  }

  async function handleFormSubmit(formValues: {
    name: string;
    email: string;
    businessName: string;
    url: string;
    consent: boolean;
    honeypot: string;
  }) {
    if (submitting || submitted) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        answers: answers as AnswerValue[],
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        businessName: formValues.businessName.trim(),
        url: formValues.url.trim(),
        consent: formValues.consent,
        honeypot: formValues.honeypot,
        token: submitToken,
        formLoadTime,
      };

      const res = await fetch("/api/web-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({})) as {
        success?: boolean;
        error?: string;
        code?: string;
      };

      if (res.ok && data.success) {
        trackEvent("web_check_submit_success");
        setSubmitted(true);
        setPhase("submitted");
      } else if (data.code === "NOT_CONFIGURED") {
        trackEvent("web_check_submit_error", { reason: "not_configured" });
        setSubmitError(
          "現在メール送信の設定が準備中です。大変恐れ入りますが、" +
          "直接メールにてご連絡いただけますでしょうか。"
        );
      } else {
        trackEvent("web_check_submit_error", { reason: "server_error" });
        setSubmitError(
          data.error ??
            "送信中にエラーが発生しました。時間をおいて再度お試しください。"
        );
      }
    } catch {
      trackEvent("web_check_submit_error", { reason: "network_error" });
      setSubmitError(
        "ネットワークエラーが発生しました。接続を確認して再度お試しください。"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 各フェーズの描画 ────────────────────────

  if (phase === "intro") {
    return (
      <div className="wc-intro">
        <p className="wc-intro-note">
          この結果は、回答内容をもとにした簡易チェックです。医療・法律などの専門的な診断ではありません。結果を見るためにメールアドレスの入力は不要です。
        </p>
        <button type="button" className="btn wc-start-btn" onClick={handleStart}>
          チェックを始める
        </button>
      </div>
    );
  }

  if (phase === "quiz") {
    return (
      <QuizSection
        currentQ={currentQ}
        answers={answers}
        onAnswer={handleAnswer}
        onBack={handleBack}
        onNext={handleNext}
      />
    );
  }

  if ((phase === "result" || phase === "choice" || phase === "form") && diagnosis) {
    const { isAllZero, zeroResult, primary, secondary, primaryResult, secondaryResult, connectorText } = diagnosis;

    return (
      <div>
        {/* ─── 診断結果 ─── */}
        <div
          className="wc-result"
          ref={resultRef}
          tabIndex={-1}
          aria-label="診断結果"
        >
          {isAllZero ? (
            <>
              <h2 className="wc-result-heading wc-result-heading--zero">
                {zeroResult.heading}
              </h2>
              <p className="wc-result-state">{zeroResult.state}</p>
              <div className="wc-donow">
                <p className="wc-donow-label">今すぐできること</p>
                <p>{zeroResult.doNow}</p>
              </div>
            </>
          ) : (
            <>
              <div className="wc-result-cards">
                <ResultCard
                  rank="primary"
                  label={CATEGORY_NAMES[primary as CategoryKey]}
                  categoryKey={primary as CategoryKey}
                />
                {secondary && (
                  <ResultCard
                    rank="secondary"
                    label={CATEGORY_NAMES[secondary]}
                    categoryKey={secondary}
                  />
                )}
              </div>

              {connectorText && (
                <p className="wc-connector">{connectorText}</p>
              )}

              {primaryResult && (
                <div className="wc-result-detail">
                  <h2 className="wc-result-heading">{primaryResult.heading}</h2>
                  <p className="wc-result-state">{primaryResult.state}</p>

                  {primaryResult.improvements.length > 0 && (
                    <ul className="wc-improvements">
                      {primaryResult.improvements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}

                  <p className="wc-approach">{primaryResult.approach}</p>

                  {secondaryResult && secondary && (
                    <div className="wc-secondary-note">
                      <strong>
                        あわせて：{CATEGORY_NAMES[secondary]}
                      </strong>
                      <p>{secondaryResult.approach}</p>
                    </div>
                  )}

                  <div className="wc-donow">
                    <p className="wc-donow-label">今すぐできること</p>
                    <p>{primaryResult.doNow}</p>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="wc-disclaimer">
            ※ この結果は、回答内容をもとにした簡易チェックです。実際のホームページや運用状況を確認すると、優先順位が変わる場合があります。
          </p>
        </div>

        {/* ─── 相談の選択 ─── */}
        {(phase === "result" || phase === "choice" || phase === "form") && (
          <div
            className="wc-choice"
            ref={choiceRef}
            tabIndex={-1}
          >
            <h2 className="wc-choice-title">この結果について相談しますか？</h2>

            {phase === "result" && (
              <div className="wc-choice-btns">
                <button
                  type="button"
                  className="wc-choice-btn wc-choice-btn--yes"
                  onClick={() => handleConsultChoice("yes")}
                >
                  診断結果をもとに相談する
                </button>
                <button
                  type="button"
                  className="wc-choice-btn wc-choice-btn--no"
                  onClick={() => handleConsultChoice("no")}
                >
                  今回は結果だけ確認する
                </button>
              </div>
            )}

            {(phase === "choice" || phase === "form") && (
              <FormSection
                onSubmit={handleFormSubmit}
                submitting={submitting}
                submitError={submitError}
                diagnosis={diagnosis}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  if (phase === "declined") {
    return (
      <div
        className="wc-declined"
        ref={submittedRef}
        tabIndex={-1}
        aria-label="チェック完了"
      >
        <p className="wc-declined-msg">
          ご利用ありがとうございました。必要になったときに、いつでもご相談ください。
        </p>
        <div className="wc-related-links">
          <Link href="/service/web-design" className="related-link">
            ホームページ制作・リニューアルを見る
          </Link>
          <Link href="/services" className="related-link">
            SHIMA CRAFTのサービス一覧を見る
          </Link>
          <Link href="/" className="related-link">
            トップページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "submitted") {
    return (
      <div
        className="wc-submitted"
        ref={submittedRef}
        tabIndex={-1}
        role="status"
        aria-label="送信完了"
      >
        <svg
          className="wc-submitted-icon"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="20" />
          <polyline points="14 24 21 31 34 17" />
        </svg>
        <h2 className="wc-submitted-title">送信が完了しました</h2>
        <p className="wc-submitted-msg">
          内容を確認後、メールでご連絡します。
        </p>
        <div className="wc-related-links">
          <Link href="/service/web-design" className="related-link">
            ホームページ制作・リニューアルを見る
          </Link>
          <Link href="/services" className="related-link">
            SHIMA CRAFTのサービス一覧を見る
          </Link>
          <Link href="/" className="related-link">
            トップページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
