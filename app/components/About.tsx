import { Reveal } from "@/app/components/Reveal";

export function About() {
  return (
    <section id="about">
      <div className="container">
        <div className="section-label">Why SHIMA CRAFT</div>
        <Reveal dir="up">
          <h2 className="section-title">SHIMA CRAFTの特徴</h2>
        </Reveal>

        <Reveal dir="left">
          <p className="about-text">
            鹿児島の離島に暮らしているからこそ、地域の空気感や小さな事業の見せ方を大切にします。
            <br />
            ホームページだけでなく、写真・動画・予約や顧客管理の画面まで、必要な内容を一緒に整理します。
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
              <p>地域の事業者の状況に合った提案</p>
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
              <p>写真・動画・業務の流れまで相談できる</p>
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
              <p>専門用語を抑えて必要な内容を整理</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
