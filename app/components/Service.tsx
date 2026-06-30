import Link from "next/link";
import { Reveal } from "@/app/components/Reveal";
import { TrackedLink } from "@/app/components/TrackedLink";

type Service = {
  title: string;
  concern: string;
  support: string;
  href: string;
  cta: string;
};

const SERVICES: Service[] = [
  {
    title: "ホームページ制作・リニューアル",
    concern: "サイトが古い、スマートフォンで見づらい、事業の魅力が伝わりにくい方向け。",
    support: "見せ方・文章・写真の使い方を整理し、事業内容が伝わるページに整えます。",
    href: "#works",
    cta: "サイトサンプルを見る",
  },
  {
    title: "Web集客・問い合わせまでの流れ",
    concern: "SNSや口コミに頼っていて、問い合わせまでの流れが分かりにくい方向け。",
    support: "Googleマップ、予約・問い合わせの流れなど、Web上の入口を確認します。",
    href: "#contact",
    cta: "相談する",
  },
  {
    title: "予約・顧客管理などの業務画面",
    concern: "予約や顧客情報を、電話・紙・複数ツールで管理している方向け。",
    support: "業務システム画面サンプルを見ながら、必要な管理画面を検討できます。",
    href: "/system-samples",
    cta: "画面サンプルを見る",
  },
  {
    title: "写真・動画・ドローン撮影",
    concern: "施設やサービスの雰囲気を、写真や動画でうまく伝えたい方向け。",
    support: "WebサイトやSNSで使いやすい写真・動画・空撮素材づくりを支援します。",
    href: "#works",
    cta: "制作例を見る",
  },
];

export function Service() {
  return (
    <section id="service" style={{ background: "rgba(42,157,143,.04)" }}>
      <div className="container">
        <div className="section-label">Service</div>
        <Reveal dir="up">
          <h2 className="section-title">SHIMA CRAFTでできること</h2>
        </Reveal>
        <Reveal dir="up" delay={0.1}>
          <p className="section-lead">
            まずはホームページ制作・改善を軸に、問い合わせまでの流れや業務の流れまで必要な範囲を整理します。
          </p>
        </Reveal>

        <Reveal dir="right">
          <div className="cards service-grid">
            {SERVICES.map((s) => (
              <article className="card service-card" key={s.title}>
                <h3>{s.title}</h3>
                <p className="service-label">こんな悩み向け</p>
                <p className="desc">{s.concern}</p>
                <p className="service-label">支援内容</p>
                <p className="desc">{s.support}</p>
                <TrackedLink
                  href={s.href}
                  className="text-link"
                  eventName={s.href === "/system-samples" ? "sample_list_click" : "service_click"}
                  eventParams={{ service: s.title }}
                >
                  {s.cta}
                </TrackedLink>
              </article>
            ))}
          </div>
        </Reveal>
        <Reveal dir="up" delay={0.2}>
          <div style={{ textAlign: "center", marginTop: "2.5rem", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "18px" }}>
            <Link href="/services" className="text-link">
              サービスを詳しく見る
            </Link>
            <Link href="/web-check" className="text-link" style={{ fontSize: "0.88rem", color: "#888" }}>
              1分でWeb導線をチェックする
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
