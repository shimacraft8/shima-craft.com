import { Reveal } from "@/app/components/Reveal";

type Service = {
  title: string;
  desc: string;
  price: string;
  badge?: { type: "new" | "prep"; label: string };
};

const SERVICES: Service[] = [
  {
    title: "HP制作",
    desc: "HPが古い・ないお店に、新しい顔を。",
    price: "制作費 50,000円〜",
  },
  {
    title: "HP保守・運用",
    desc: "作ったあとも、ずっとサポート。",
    price: "月額 5,000円〜",
  },
  {
    title: "空撮・映像制作",
    desc: "ドローン空撮から編集まで一貫対応。島の絶景をそのままWebや動画に。",
    price: "30,000円〜/本",
    badge: { type: "new", label: "NEW" },
  },
  {
    title: "動画編集",
    desc: "SNS・YouTube向けの動画編集に対応。Premiere Proで高品質に仕上げます。",
    price: "3,000円〜/本",
  },
  {
    title: "ネット集客サポート",
    desc: "じゃらん・ホットペッパー・Googleマップ・公式LINEなど、ネット集客まわりの登録・構築をまるごと代行。",
    price: "登録・構築 30,000円〜",
  },
];

export function Service() {
  return (
    <section id="service" style={{ background: "rgba(42,157,143,.04)" }}>
      <div className="container">
        <div className="section-label">Service</div>
        <Reveal dir="up">
          <h2 className="section-title">SERVICE</h2>
        </Reveal>

        <Reveal dir="right">
          <div className="cards">
            {SERVICES.map((s) => (
              <article className="card" key={s.title}>
                {s.badge && (
                  <span className={`badge ${s.badge.type}`}>
                    {s.badge.label}
                  </span>
                )}
                <h3>{s.title}</h3>
                <p className="desc">{s.desc}</p>
                <div className="price">{s.price}</div>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
