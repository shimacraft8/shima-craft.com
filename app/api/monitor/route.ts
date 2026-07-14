import "server-only";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { name, business, url, issue, email, area, deadline } = await req.json();

  if (!name || !business || !issue || !email || !area) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "RESEND_NOT_CONFIGURED" }, { status: 500 });
  }

  const text = [
    `お名前：${name}`,
    `店名・事業名：${business}`,
    `URL：${url || "未記入"}`,
    `希望内容・課題：`,
    issue,
    "",
    `所在地・対応地域：${area}`,
    `希望時期：${deadline || "未記入"}`,
    `返信先：${email}`,
    `モニター条件・料金確認：同意済み`,
  ].join("\n");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: "shimacraft8@gmail.com",
    replyTo: email,
    subject: `モニター申込｜${business}`,
    text,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "SEND_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
