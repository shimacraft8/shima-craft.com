import { Reveal } from "@/app/components/Reveal";

const PROBLEMS = [
  "ホームページが古く、スマートフォンで見づらい",
  "Instagramや口コミだけに集客を頼っている",
  "サイトはあるが、問い合わせまでの導線が分かりにくい",
  "予約や顧客情報を電話、紙、複数のツールで管理している",
  "写真や文章で事業の魅力をうまく伝えられない",
  "何から改善すればよいか分からない",
];

export function Problems() {
  return (
    <section id="problems" className="problems-section">
      <div className="container">
        <div className="section-label">First Step</div>
        <Reveal dir="up">
          <h2 className="section-title">こんなお悩みから相談できます</h2>
        </Reveal>
        <Reveal dir="up" delay={0.1}>
          <div className="problem-grid">
            {PROBLEMS.map((problem) => (
              <article className="problem-card" key={problem}>
                <span aria-hidden="true" />
                <p>{problem}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
