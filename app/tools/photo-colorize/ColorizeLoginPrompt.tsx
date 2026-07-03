import Link from "next/link";

/**
 * 未ログイン時の導線（Server Componentのみ・重い画像処理コードを一切含まない）。
 * ここでは PhotoColorizeClient を描画しないため、モデル・ORTランタイム・
 * カラー化のクライアントchunkはロードされない。
 */
export function ColorizeLoginPrompt({ contactHref }: { contactHref: string }) {
  return (
    <div className="colorize-login-prompt">
      <h2 className="colorize-login-title">カラー化サービスを利用する</h2>
      <p>本サービスのご利用には、SHIMA CRAFTが発行したアカウントが必要です。</p>
      <p className="colorize-login-sub">
        ご利用料金・利用回数・契約条件は、ご利用内容に応じて個別にご案内します。
      </p>
      <div className="colorize-login-actions">
        <Link href="/login?next=/tools/photo-colorize" className="btn">
          Googleアカウントでログイン
        </Link>
        <a href={contactHref} className="btn btn-ghost colorize-btn-ghost">
          利用について問い合わせる
        </a>
      </div>
    </div>
  );
}
