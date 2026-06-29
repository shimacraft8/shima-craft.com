import type { Metadata } from "next";
import { ArrowRight, Grid3X3, ShieldCheck } from "lucide-react";
import { demos } from "@/lib/demoConfigs";
import { TrackedLink } from "@/app/components/TrackedLink";

export const metadata: Metadata = {
  title: "業務システム画面サンプル",
  description:
    "店舗・宿泊施設・工務店など、業務改善に使える管理画面のサンプルです。入力・保存などの実処理は行わず、画面レイアウトや導入イメージをご確認いただけます。",
  alternates: {
    canonical: "/system-samples",
  },
  openGraph: {
    title: "業務システム画面サンプル｜SHIMA CRAFT",
    description:
      "店舗・宿泊施設・工務店など、業務改善に使える管理画面のサンプルです。画面レイアウトや導入イメージをご確認いただけます。",
    url: "/system-samples",
  },
  twitter: {
    title: "業務システム画面サンプル｜SHIMA CRAFT",
    description:
      "店舗・宿泊施設・工務店など、業務改善に使える管理画面のサンプルです。画面レイアウトや導入イメージをご確認いただけます。",
  },
};

export default function Home() {
  return (
    <div className="sample-scope">
      <main className="home">
        <section className="home-hero">
          <div>
            <p className="eyebrow">SHIMA CRAFT SYSTEM SAMPLES</p>
            <h1>
              <span className="sample-title-piece">業務システム</span>
              <span className="sample-title-piece">サンプル</span>
            </h1>
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
            <TrackedLink
              className="demo-index-card"
              href={`/${demo.id}`}
              key={demo.id}
              eventName="demo_open"
              eventParams={{ demo: demo.id, source: "system_samples" }}
            >
              <span className="demo-number">{demo.no}</span>
              <div>
                <h2>{demo.shortName}</h2>
                <p>{demo.target}</p>
              </div>
              <ArrowRight size={20} />
            </TrackedLink>
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
