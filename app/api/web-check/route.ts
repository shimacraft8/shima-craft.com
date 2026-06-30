import { NextRequest, NextResponse } from "next/server";
import { site } from "@/app/lib/site";
import { CATEGORY_NAMES, QUESTIONS } from "@/app/web-check/webCheckData";
import {
  validateSubmission,
  getDiagnosisResult,
  SubmissionData,
} from "@/app/web-check/webCheckLogic";

// --- 簡易インメモリ レート制限 ---
// Vercel Serverless は複数インスタンス間で共有されないため、
// あくまで同一インスタンス内での連続送信に対する補助的な対策です。
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// --- 二重送信防止トークン ---
const usedTokens = new Map<string, number>();

function checkSubmitToken(token: string): boolean {
  if (!token || usedTokens.has(token)) return false;
  // 10分超えたトークンを一括削除
  const now = Date.now();
  Array.from(usedTokens.entries()).forEach(([t, ts]) => {
    if (now - ts > 600_000) usedTokens.delete(t);
  });
  usedTokens.set(token, now);
  return true;
}

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
async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("RESEND_API_KEY が設定されていません"), {
      code: "NOT_CONFIGURED",
    });
  }

  const fromAddress = process.env.RESEND_FROM ?? "onboarding@resend.dev";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
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
    const body = await res.text().catch(() => "");
    throw new Error(`Resend error: ${res.status} ${body.slice(0, 200)}`);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Content-Type チェック
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json(
      { success: false, error: "不正なリクエストです" },
      { status: 400 }
    );
  }

  // Origin チェック（CSRF の軽減）
  const origin = request.headers.get("origin") ?? "";
  const host = request.headers.get("host") ?? "";
  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`,
    "http://localhost:3000",
    "http://localhost:3001",
  ];
  if (origin && !allowedOrigins.some((o) => origin.startsWith(o))) {
    return NextResponse.json(
      { success: false, error: "不正なリクエストです" },
      { status: 403 }
    );
  }

  // リクエストサイズ制限（JSON本文 32KB 以内）
  const rawBody = await request.text();
  if (rawBody.length > 32_768) {
    return NextResponse.json(
      { success: false, error: "リクエストが大きすぎます" },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "不正なリクエストです" },
      { status: 400 }
    );
  }

  const data = body as SubmissionData;

  // IP ベースのレート制限
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "しばらく経ってから再度お試しください" },
      { status: 429 }
    );
  }

  // 二重送信トークン
  const token = typeof data.token === "string" ? data.token : "";
  if (!checkSubmitToken(token)) {
    return NextResponse.json(
      {
        success: false,
        error: "すでに送信済みです。内容を確認後、ご連絡します。",
      },
      { status: 409 }
    );
  }

  // バリデーション（ハニーポット・時間チェック込み）
  const validation = validateSubmission(data);
  if (!validation.valid) {
    if (validation.errors._bot) {
      // ボット判定は 200 を返してスパマーに情報を与えない
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(
      { success: false, errors: validation.errors },
      { status: 422 }
    );
  }

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

  // 流入情報
  const referer = request.headers.get("referer") ?? "";
  const rawUtm = typeof data.url === "string"
    ? new URL(data.url, "https://example.com").searchParams
    : null;
  const utm = rawUtm
    ? ["utm_source", "utm_medium", "utm_campaign"]
        .map((k) => `${k}=${rawUtm.get(k) ?? ""}`)
        .filter((s) => !s.endsWith("="))
        .join("&")
    : "";

  const subject = "【SHIMA CRAFT】Web導線チェックからのご相談";
  const text = buildEmailText({
    receivedAt: new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    primary: primaryLabel,
    secondary: secondaryLabel,
    answers: answers as string[],
    categoryScores: scores,
    name: validation.safeName!,
    email: validation.safeEmail!,
    businessName: validation.safeBusinessName,
    url: validation.safeUrl,
    referer,
    utm,
  });

  try {
    await sendEmail(site.email, subject, text);
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error & { code?: string };

    if (error.code === "NOT_CONFIGURED") {
      // メール設定未完了であることを明示（偽装成功しない）
      return NextResponse.json(
        {
          success: false,
          error:
            "メール送信の設定が未完了のため、送信できませんでした。管理者にご連絡ください。",
          code: "NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    // メール送信失敗（内部エラーの詳細は返さない）
    return NextResponse.json(
      {
        success: false,
        error:
          "送信中にエラーが発生しました。時間をおいて再度お試しいただくか、メールでご連絡ください。",
      },
      { status: 500 }
    );
  }
}
