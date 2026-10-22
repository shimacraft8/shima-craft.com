import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http/origin";
import { readJSON, allowRequest, clientAddress, beginSubmission, finishSubmission, verifyChallenge, RequestError, safeError } from "@/lib/http/security";

export async function POST(req: NextRequest) {
  let token = "", attempted = false;
  try {
    if (!isSameOrigin(req)) throw new RequestError(403, "BAD_ORIGIN");
    if (!allowRequest("monitor", clientAddress(req), 5)) throw new RequestError(429, "RATE_LIMIT");
    const data = await readJSON(req, 16_384);
    const values: Record<string, string> = {};
    for (const [key, max, required] of [["name",100,true],["business",150,true],["url",2048,false],["issue",4000,true],["email",254,true],["area",150,true],["deadline",200,false]] as const) {
      const value = typeof data[key] === "string" ? (data[key] as string).trim() : "";
      if ((required && !value) || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new RequestError(422, "INVALID_FIELDS");
      values[key] = value;
    }
    if (!/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(values.email) || /[\r\n]/.test(values.business)) throw new RequestError(422, "INVALID_FIELDS");
    if (values.url) { let u: URL; try { u = new URL(values.url); } catch { throw new RequestError(422, "INVALID_URL"); } if (!["http:","https:"].includes(u.protocol) || u.username || u.password) throw new RequestError(422, "INVALID_URL"); }
    if (data.consent !== true) throw new RequestError(422, "CONSENT_REQUIRED");
    const apiKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
    if (!apiKey || !from) throw new RequestError(503, "NOT_CONFIGURED");
    token = typeof data.token === "string" ? data.token : "";
    await verifyChallenge(req, data.challengeToken, "monitor");
    if (beginSubmission("monitor", token, values) === "done") return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    const text = [`お名前：${values.name}`, `店名・事業名：${values.business}`, `URL：${values.url || "未記入"}`, "希望内容・課題：", values.issue, `所在地・対応地域：${values.area}`, `希望時期：${values.deadline || "未記入"}`, `返信先：${values.email}`, "モニター条件・料金確認：同意済み"].join("\n");
    attempted = true;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey, "Idempotency-Key": "monitor-" + token },
      body: JSON.stringify({ from, to: ["shimacraft8@gmail.com"], reply_to: values.email, subject: `モニター申込｜${values.business}`, text }),
    });
    if (!response.ok) { finishSubmission("monitor", token, "failed"); throw new RequestError(503, "SEND_FAILED"); }
    finishSubmission("monitor", token, "done");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (attempted && !(error instanceof RequestError)) finishSubmission("monitor", token, "unknown");
    return safeError(error);
  }
}
