import { Reveal } from "@/app/components/Reveal";

export function About() {
  return (
    <section id="about">
      <div className="container">
        <div className="section-label">About</div>
        <Reveal dir="up">
          <h2 className="section-title">SHIMA CRAFTについて</h2>
        </Reveal>

        <Reveal dir="left">
          <p className="about-text">
            東京の制作会社に頼んだら、島の雰囲気と全然違うものが届いた——
            <br />
            そんな経験をしている離島の事業者さんは多いはず。
            <br />
            <br />
            鹿児島の離島に暮らしているから、島の空気感・島の商売の感覚を知っています。
            <br />
            HP制作・空撮・動画編集・Web運用まで、島の事業者さんをまるごとサポートします。
          </p>
        </Reveal>

        <Reveal dir="left" delay={0.1}>
          <div className="about-icons">
            <div className="about-icon">
              <svg
                className="ico"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 18c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4" />
                <path d="M4 30c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4" />
              </svg>
              <p>離島の文化・感覚がわかる</p>
            </div>
            <div className="about-icon">
              <svg
                className="ico"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 16h6l3-4h14l3 4h6v22H8z" />
                <circle cx="24" cy="27" r="7" />
              </svg>
              <p>空撮・撮影・動画編集まで対応</p>
            </div>
            <div className="about-icon">
              <svg
                className="ico"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="6" y="9" width="36" height="24" rx="2" />
                <line x1="18" y1="40" x2="30" y2="40" />
                <line x1="24" y1="33" x2="24" y2="40" />
              </svg>
              <p>HP制作から運用まで一貫対応</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
