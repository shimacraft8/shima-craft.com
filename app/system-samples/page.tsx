import Link from "next/link";
import { ArrowRight, Grid3X3, ShieldCheck } from "lucide-react";
import { demos } from "@/lib/demoConfigs";

export default function Home() {
  return (
    <div className="sample-scope">
      <main className="home">
        <section className="home-hero">
          <div>
            <p className="eyebrow">SHIMA CRAFT SYSTEM SAMPLES</p>
            <h1>業務システムサンプル</h1>
            <p className="home-lead">
              店舗・宿泊施設・工務店など、業務改善に使える管理画面のサンプルです。
              画面レイアウトや導入イメージをご確認いただけます。
            </p>
          </div>
          <div className="home-panel">
            <ShieldCheck size={28} />
            <strong>画面レイアウトをご確認いただけます</strong>
            <span>入力・保存などの実処理は行わないサンプル表示です。</span>
          </div>
        </section>

        <section className="demo-index" aria-label="サンプル一覧">
          {demos.map((demo) => (
            <Link className="demo-index-card" href={`/${demo.id}`} key={demo.id}>
              <span className="demo-number">{demo.no}</span>
              <div>
                <h2>{demo.shortName}</h2>
                <p>{demo.target}</p>
              </div>
              <ArrowRight size={20} />
            </Link>
          ))}
        </section>

        <section className="home-note">
          <Grid3X3 size={22} />
          <p>
            各サンプルでは、ダッシュボード・一覧・確認画面などの導入イメージをご確認いただけます。
          </p>
        </section>
      </main>
    </div>
  );
}
