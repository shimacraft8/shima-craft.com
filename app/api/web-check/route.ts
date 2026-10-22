import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import { readJSON, allowRequest, clientAddress, beginSubmission, finishSubmission, verifyChallenge, RequestError, safeError } from "@/lib/http/security";
import { site } from "@/app/lib/site";
import { CATEGORY_NAMES, QUESTIONS } from "@/app/web-check/webCheckData";
import {
  validateSubmission,
  getDiagnosisResult,
  SubmissionData,
} from "@/app/web-check/webCheckLogic";

// --- メール本文の組み立て ---
function buildEmailText(params: {
  receivedAt: string;
  primary: string;
  secondary: string;
  answers: string[];
  categoryScores: Record<string, number>;
  name: string;
  email: string;
  businessName?: string;
  url?: string;
  referer: string;
  utm: string;
}): string {
  const {
    receivedAt,
    primary,
    secondary,
    answers,
    categoryScores,
    name,
    email,
    businessName,
    url,
    referer,
    utm,
  } = params;

  const answerLabel = { yes: "はい", no: "いいえ", unknown: "分からない" };

  const answerLines = QUESTIONS.map(
    (q, i) =>
      `Q${q.id}（${CATEGORY_NAMES[q.category]}）\n${q.text}\n→ ${answerLabel[answers[i] as keyof typeof answerLabel] ?? answers[i]}`
  ).join("\n\n");

  const scoreLines = Object.entries(categoryScores)
    .map(([k, v]) => `  ${CATEGORY_NAMES[k as keyof typeof CATEGORY_NAMES] ?? k}: ${v}点`)
    .join("\n");

  return `
【SHIMA CRAFT】Web導線チェックからのご相談

━━━━━━━━━━━━━━━━━━━━━━━━
受付日時：${receivedAt}
━━━━━━━━━━━━━━━━━━━━━━━━

■ 診断結果
主な課題：${primary}
あわせて見直したい項目：${secondary}

■ カテゴリー別スコア
${scoreLines}

■ 8問の回答
${answerLines}

━━━━━━━━━━━━━━━━━━━━━━━━
■ 相談者情報
お名前：${name}
メール：${email}
事業名：${businessName ?? "（未入力）"}
URL　：${url ?? "（未入力）"}

■ 流入情報
参照元：${referer || "（不明）"}
UTM　：${utm || "（なし）"}
━━━━━━━━━━━━━━━━━━━━━━━━
※ このメールは Web導線かんたんチェックフォームから自動送信されました。
`.trim();
}

// --- Resend REST API でメール送信（環境変数 RESEND_API_KEY が必要） ---
async function sendEmail(to: string, subject: string, text: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("RESEND_API_KEY が設定されていません"), {
      code: "NOT_CONFIGURED",
    });
  }

  const fromAddress = process.env.RESEND_FROM;
  if (!fromAddress) throw new RequestError(503, "NOT_CONFIGURED");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
    headers: {
      "Idempotency-Key": "web-check-" + token,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `SHIMA CRAFT <${fromAddress}>`,
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    throw new RequestError(503, "SEND_FAILED");
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let token = "", attempted = false;
  try {
    if (!isSameOrigin(request)) throw new RequestError(403, "BAD_ORIGIN");
    if (!allowRequest("web-check", clientAddress(request), 5)) throw new RequestError(429, "RATE_LIMIT");
    const body = await readJSON(request, 32_768);
    const data = body as unknown as SubmissionData;
    const validation = validateSubmission(data);
    if (!validation.valid) throw new RequestError(422, "INVALID_FIELDS");
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) throw new RequestError(503, "NOT_CONFIGURED");
    token = typeof data.token === "string" ? data.token : "";
    await verifyChallenge(request, body.challengeToken, "web-check");
    const payload = { answers: validation.safeAnswers, name: validation.safeName, email: validation.safeEmail, businessName: validation.safeBusinessName, url: validation.safeUrl };
    if (beginSubmission("web-check", token, payload) === "done") return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  // サーバー側で回答から結果を再計算（クライアントの値は使用しない）
  const answers = validation.safeAnswers!;
  const diagnosis = getDiagnosisResult(answers);

  const primaryLabel = diagnosis.isAllZero
    ? "課題なし"
    : CATEGORY_NAMES[diagnosis.primary as keyof typeof CATEGORY_NAMES] ?? diagnosis.primary;
  const secondaryLabel = diagnosis.secondary
    ? CATEGORY_NAMES[diagnosis.secondary]
    : "—";

  // カテゴリー別スコア（メール記載用）
  const scores: Record<string, number> = {};
  let info = 0, conv = 0, web = 0, ops = 0;
  for (let i = 0; i < 8; i++) {
    const q = QUESTIONS[i];
    const s = answers[i] === "yes" ? 2 : answers[i] === "unknown" ? 1 : 0;
    if (q.category === "information") info += s;
    if (q.category === "conversion") conv += s;
    if (q.category === "website") web += s;
    if (q.category === "operations") ops += s;
  }
  scores["information"] = info;
  scores["conversion"] = conv;
  scores["website"] = web;
  scores["operations"] = ops;


    const text = buildEmailText({ receivedAt: new Date().toISOString(), primary: primaryLabel, secondary: secondaryLabel,
      answers: answers as string[], categoryScores: scores, name: validation.safeName!, email: validation.safeEmail!,
      businessName: validation.safeBusinessName, url: validation.safeUrl, referer: "", utm: "" });
    attempted = true;
    await sendEmail(site.email, "【SHIMA CRAFT】Web導線チェックからのご相談", text, token);
    finishSubmission("web-check", token, "done");
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (attempted) finishSubmission("web-check", token, error instanceof RequestError ? "failed" : "unknown");
    return safeError(error);
  }
}
