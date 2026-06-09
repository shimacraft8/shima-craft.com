import { Reveal } from "@/app/components/Reveal";

type Work = {
  category: string;
  title: string;
  desc: string;
  url: string;
  accent: string; // カードのアクセントカラー（top border）
};

const WORKS: Work[] = [
  {
    category: "整体院",
    title: "南風整体院",
    desc: "産後骨盤矯正・腰痛専門の整体院サイト。アースカラーで温かみのある癒し系デザイン。",
    url: "https://nanpu-seitai.vercel.app",
    accent: "#A8845A",
  },
  {
    category: "美容院",
    title: "Luce hair",
    desc: "カット・カラー・ヘッドスパ専門の美容院サイト。北欧風ミニマルホワイトデザイン。",
    url: "https://luce-hair.vercel.app",
    accent: "#2A9D8F",
  },
  {
    category: "カフェ",
    title: "KURO STAND",
    desc: "スペシャルティコーヒースタンドのサイト。ダーク＆スタイリッシュなモダンデザイン。",
    url: "https://kuro-stand.vercel.app",
    accent: "#1A1A1A",
  },
];

export function Works() {
  return (
    <section id="works">
      <div className="container">
        <div className="section-label">Works</div>
        <Reveal dir="up">
          <h2 className="section-title">WORKS</h2>
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
                  <span className="work-category">{w.category}</span>
                  <h3 className="work-title">{w.title}</h3>
                  <p className="work-desc">{w.desc}</p>
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="work-link"
                  >
                    サイトを見る
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
                  </a>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
