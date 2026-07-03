import "server-only";
import { Resend } from "resend";

/**
 * 招待メール送信（Resend）。
 * - 招待リンク（raw tokenを含む）は本文にのみ載せ、ログには出さない。
 * - RESEND_API_KEY 未設定時は送信失敗として扱う（偽装送信しない）。
 */

export type SendInvitationResult = { ok: true } | { ok: false; error: string };

export async function sendInvitationEmail(params: {
  toEmail: string;
  displayName: string;
  inviteUrl: string;
}): Promise<SendInvitationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  if (!apiKey) return { ok: false, error: "RESEND_NOT_CONFIGURED" };

  const resend = new Resend(apiKey);
  const name = params.displayName || "お客様";

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.toEmail,
      subject: "【SHIMA CRAFT】白黒写真カラー化サービスのご招待",
      text: [
        `${name} 様`,
        "",
        "SHIMA CRAFT の白黒写真カラー化サービスへご招待します。",
        "以下のリンクを開き、Googleアカウントでログインするとご利用を開始できます。",
        "",
        params.inviteUrl,
        "",
        "※このリンクは一定期間で無効になります。",
        "※ご本人以外は使用できません（招待されたメールアドレスのGoogleアカウントでのみ有効です）。",
        "※ご利用料金・利用回数・契約条件は、ご利用内容に応じて個別にご案内します。",
        "",
        "SHIMA CRAFT",
      ].join("\n"),
    });
    if (error) return { ok: false, error: "SEND_FAILED" };
    return { ok: true };
  } catch {
    return { ok: false, error: "SEND_FAILED" };
  }
}
