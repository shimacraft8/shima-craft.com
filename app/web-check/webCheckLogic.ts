// Web導線かんたんチェック — 採点・ランキング・結果生成の純粋関数

import {
  AnswerValue,
  CategoryKey,
  CategoryResult,
  DiagnosisResult,
  QUESTIONS,
  CATEGORY_PRIORITY,
  CATEGORY_RESULTS,
  ZERO_RESULT,
  COMBO_TEXT,
} from "./webCheckData";

// 回答値 → 点数
export function scoreAnswer(answer: AnswerValue): number {
  if (answer === "yes") return 2;
  if (answer === "unknown") return 1;
  return 0;
}

// 8問の回答からカテゴリー別スコアを計算
export function calculateScores(
  answers: AnswerValue[]
): Record<CategoryKey, number> {
  const scores: Record<CategoryKey, number> = {
    information: 0,
    conversion: 0,
    website: 0,
    operations: 0,
  };

  for (let i = 0; i < Math.min(answers.length, QUESTIONS.length); i++) {
    const q = QUESTIONS[i];
    scores[q.category] += scoreAnswer(answers[i]);
  }

  return scores;
}

// スコアが全カテゴリー0かどうか
export function isAllZeroScore(scores: Record<CategoryKey, number>): boolean {
  return Object.values(scores).every((v) => v === 0);
}

// カテゴリーを高スコア順にソート（同点は CATEGORY_PRIORITY で決定）
export function rankCategories(
  scores: Record<CategoryKey, number>
): CategoryKey[] {
  const keys: CategoryKey[] = ["information", "conversion", "website", "operations"];
  return [...keys].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return CATEGORY_PRIORITY.indexOf(a) - CATEGORY_PRIORITY.indexOf(b);
  });
}

// 診断結果を生成
export function getDiagnosisResult(answers: AnswerValue[]): DiagnosisResult {
  if (answers.length !== 8) {
    throw new RangeError("answers must have exactly 8 elements");
  }

  const scores = calculateScores(answers);
  const allZero = isAllZeroScore(scores);

  if (allZero) {
    return {
      primary: "none",
      secondary: null,
      primaryResult: null,
      secondaryResult: null,
      connectorText: null,
      isAllZero: true,
      zeroResult: ZERO_RESULT,
    };
  }

  const ranked = rankCategories(scores);
  const primary = ranked[0];
  const secondary = ranked[1];

  const primaryResult: CategoryResult = CATEGORY_RESULTS[primary];
  const secondaryResult: CategoryResult = CATEGORY_RESULTS[secondary];

  const comboKey = `${primary}_${secondary}`;
  const connectorText = COMBO_TEXT[comboKey] ?? null;

  return {
    primary,
    secondary,
    primaryResult,
    secondaryResult,
    connectorText,
    isAllZero: false,
    zeroResult: ZERO_RESULT,
  };
}

// フォーム送信データのサーバー側バリデーション
export interface SubmissionData {
  answers: unknown;
  name: unknown;
  email: unknown;
  businessName?: unknown;
  url?: unknown;
  consent: unknown;
  honeypot?: unknown;
  token: unknown;
  formLoadTime?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  safeAnswers?: AnswerValue[];
  safeName?: string;
  safeEmail?: string;
  safeBusinessName?: string;
  safeUrl?: string;
}

const VALID_ANSWERS = new Set<string>(["yes", "no", "unknown"]);

export function validateSubmission(data: SubmissionData): ValidationResult {
  const errors: Record<string, string> = {};

  // Honeypot check
  if (data.honeypot && String(data.honeypot).trim() !== "") {
    return { valid: false, errors: { _bot: "bot" } };
  }

  // Time check: reject if form was submitted too quickly (< 4 seconds)
  if (typeof data.formLoadTime === "number") {
    const elapsed = Date.now() - data.formLoadTime;
    if (elapsed < 4_000) {
      return { valid: false, errors: { _bot: "too_fast" } };
    }
  }

  // Validate answers
  if (!Array.isArray(data.answers) || data.answers.length !== 8) {
    errors.answers = "回答が不正です";
  } else {
    const invalidIdx = (data.answers as unknown[]).findIndex(
      (a) => !VALID_ANSWERS.has(String(a))
    );
    if (invalidIdx !== -1) {
      errors.answers = "回答値が不正です";
    }
  }

  // name
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    errors.name = "お名前を入力してください";
  } else if (name.length > 100) {
    errors.name = "お名前は100文字以内で入力してください";
  }

  // email
  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!email) {
    errors.email = "メールアドレスを入力してください";
  } else if (email.length > 254) {
    errors.email = "メールアドレスが長すぎます";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "メールアドレスの形式を確認してください";
  }

  // businessName (optional)
  const businessName =
    typeof data.businessName === "string" ? data.businessName.trim() : "";
  if (businessName.length > 150) {
    errors.businessName = "事業名は150文字以内で入力してください";
  }

  // url (optional)
  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (url.length > 2048) {
    errors.url = "URLが長すぎます";
  } else if (url && !/^https?:\/\/.+/.test(url)) {
    errors.url = "URLは http:// または https:// から始めてください";
  }

  // consent
  if (data.consent !== true) {
    errors.consent = "プライバシーポリシーへの同意が必要です";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    safeAnswers: (data.answers as string[]).map((a) => a as AnswerValue),
    safeName: name,
    safeEmail: email,
    safeBusinessName: businessName || undefined,
    safeUrl: url || undefined,
  };
}
