import { Reveal } from "@/app/components/Reveal";
import { TrackedLink } from "@/app/components/TrackedLink";

const SAMPLES = [
  {
    title: "宿泊予約管理",
    href: "/demo03",
    issue: "予約状況を一覧で把握したい",
    visible: "チェックイン、部屋管理、予約カレンダー",
    scene: "民泊・旅館・ゲストハウス",
  },
  {
    title: "顧客カルテ・予約管理",
    href: "/demo02",
    issue: "予約と顧客情報をまとめて見たい",
    visible: "顧客情報、予約一覧、来店履歴",
    scene: "サロン・整体院・地域サービス",
  },
  {
    title: "口コミ・Google導線",
    href: "/demo05",
    issue: "良い口コミを自然に集めたい",
    visible: "口コミ一覧、アンケート、QRリンク",
    scene: "店舗・宿泊施設・観光サービス",
  },
  {
    title: "問い合わせ管理",
    href: "/demo14",
    issue: "問い合わせ対応の抜け漏れを減らしたい",
    visible: "問い合わせ一覧、対応状況、担当管理",
    scene: "全業種の受付・対応業務",
  },
];

export function SampleHighlights() {
  return (
    <section id="samples" className="samples-section">
      <div className="container">
        <div className="section-label">System Samples</div>
        <Reveal dir="up">
          <h2 className="section-title sample-heading">業務システム画面サンプル</h2>
        </Reveal>
        <Reveal dir="up" delay={0.1}>
          <p className="section-lead">
            実際の導入実績ではなく、業務改善のイメージを確認するためのサンプル画面です。
          </p>
        </Reveal>

        <Reveal dir="up" delay={0.15}>
          <div className="sample-card-grid">
            {SAMPLES.map((sample) => (
              <article className="sample-card" key={sample.title}>
                <p className="sample-card-kicker">サンプル画面</p>
                <h3>{sample.title}</h3>
                <dl>
                  <div>
                    <dt>悩み</dt>
                    <dd>{sample.issue}</dd>
                  </div>
                  <div>
                    <dt>確認できる内容</dt>
                    <dd>{sample.visible}</dd>
                  </div>
                  <div>
                    <dt>利用場面</dt>
                    <dd>{sample.scene}</dd>
                  </div>
                </dl>
                <TrackedLink
                  href={sample.href}
                  className="text-link"
                  eventName="demo_open"
                  eventParams={{ demo: sample.href.replace("/", ""), source: "top_samples" }}
                >
                  サンプル画面を見る
                </TrackedLink>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal dir="up" delay={0.2}>
          <div className="section-cta">
            <TrackedLink
              href="/system-samples"
              className="btn btn-soft"
              eventName="sample_list_click"
              eventParams={{ source: "top_samples" }}
            >
              すべての画面サンプルを見る
            </TrackedLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
