import { Reveal } from "@/app/components/Reveal";
import { TrackedLink } from "@/app/components/TrackedLink";

type Work = {
  kind: "制作サンプル" | "画面サンプル";
  category: string;
  title: string;
  desc: string;
  scope: string;
  url: string;
  accent: string; // カードのアクセントカラー（top border）
};

const WORKS: Work[] = [
  {
    kind: "制作サンプル",
    category: "整体院",
    title: "南風整体院",
    desc: "産後骨盤矯正・腰痛専門の整体院サイト。アースカラーで温かみのある癒し系デザイン。",
    scope: "整体院サイトの見せ方・サービス紹介・問い合わせまでの流れ",
    url: "https://nanpu-seitai.vercel.app",
    accent: "#A8845A",
  },
  {
    kind: "制作サンプル",
    category: "美容院",
    title: "Luce hair",
    desc: "カット・カラー・ヘッドスパ専門の美容院サイト。北欧風ミニマルホワイトデザイン。",
    scope: "美容院サイトのメニュー紹介・雰囲気づくり・予約までの流れ",
    url: "https://luce-hair.vercel.app",
    accent: "#2A9D8F",
  },
  {
    kind: "制作サンプル",
    category: "カフェ",
    title: "KURO STAND",
    desc: "スペシャルティコーヒースタンドのサイト。ダーク＆スタイリッシュなモダンデザイン。",
    scope: "カフェサイトのブランド表現・店舗情報・来店前の情報整理",
    url: "https://kuro-stand.vercel.app",
    accent: "#1A1A1A",
  },
  {
    kind: "画面サンプル",
    category: "業務改善",
    title: "業務システムサンプル",
    desc: "店舗・宿泊施設・工務店など、業務改善に使える管理画面のサンプルです。",
    scope: "予約・顧客管理・問い合わせ管理などの画面レイアウト確認",
    url: "/system-samples",
    accent: "#E8735A",
  },
];

export function Works() {
  return (
    <section id="works">
      <div className="container">
        <div className="section-label">Works</div>
        <Reveal dir="up">
          <h2 className="section-title">Webサイト制作例と画面サンプル</h2>
        </Reveal>
        <Reveal dir="up" delay={0.1}>
          <p className="section-lead">
            サイトの見せ方や、業務改善に使う画面レイアウトを確認できます。
          </p>
        </Reveal>

        <Reveal dir="up">
          <div className="works-grid">
            {WORKS.map((w) => (
              <article className="work-card" key={w.title}>
                <div
                  className="work-card-accent"
                  style={{ background: w.accent }}
                />
                <div className="work-card-body">
                  <span className="work-kind">{w.kind}</span>
                  <span className="work-category">{w.category}</span>
                  <h3 className="work-title">{w.title}</h3>
                  <p className="work-desc">{w.desc}</p>
                  <p className="work-scope">{w.scope}</p>
                  <TrackedLink
                    href={w.url}
                    target={w.url.startsWith("http") ? "_blank" : undefined}
                    rel={w.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="work-link"
                    eventName={w.url === "/system-samples" ? "sample_list_click" : "works_click"}
                    eventParams={{ work: w.title }}
                  >
                    {w.url.startsWith("http") ? "サイトサンプルを見る" : "画面サンプルを見る"}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        <p className="works-note">
          <strong>掲載している外部サイトと画面は、制作イメージを確認するためのサンプルです。</strong>
          <br />
          サンプル画面は納品案件ではなく、レイアウトや操作感をご確認いただくためのものです。
        </p>
      </div>
    </section>
  );
}
