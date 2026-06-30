"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/app/components/Reveal";
import { trackEvent } from "@/app/components/TrackedLink";

type Item = { q: string; a: string };

const ITEMS: Item[] = [
  {
    q: "何を相談すればいいか決まっていなくても大丈夫ですか？",
    a: "はい。現在のホームページや集客、予約・顧客管理など、気になっていることをそのままお聞かせください。必要な内容を一緒に整理します。",
  },
  {
    q: "撮影の対応エリアはどこまでですか？",
    a: "奄美大島を中心に対応しています。奄美大島以外での撮影が必要な場合は、別途出張費・交通費などの追加費用がかかります。費用は撮影内容によって変わりますので、お見積もり時に明確にご案内します。",
  },
  {
    q: "保守プランにはどこまで含まれますか？",
    a: "HP制作費（150,000円〜）に初年度の保守がすべて含まれます。2年目以降はドメイン更新のタイミングで年1回の契約更新となります。保守の内容はHP維持・SSL管理・セキュリティ更新・年間を通じた軽微な修正（営業時間・料金・文言変更など）です。ページ追加・大幅なデザイン変更・写真撮影・動画制作は別途お見積もりになります。",
  },
  {
    q: "途中で解約したい場合や、ドメインを変更したい場合はどうなりますか？",
    a: "解約・変更の際は、構築済みのファイルをすべてお渡しします。ドメインの変更手続きはご自身でのご対応となりますが、引継ぎのご説明はもちろんいたします。いつでもお気軽にご相談ください。",
  },
  {
    q: "予約や顧客管理の画面だけ相談できますか？",
    a: "業務システム画面サンプルを見ながら、予約管理・顧客管理・問い合わせ管理などの相談ができます。まずは現在の管理方法や困っている点をお聞かせください。",
  },
  {
    q: "制作期間はどのくらいかかりますか？",
    a: "制作作業の目安は約3週間です。素材の準備やご確認の期間を含め、ご相談から公開までは1〜2か月程度となる場合があります。写真・空撮撮影を含む場合は天候の影響を受けることもあるため、スケジュールに余裕をもってご相談いただけると安心です。お急ぎの場合もまずはご相談ください。",
  },
];

function FaqItem({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggle = () => {
    setOpen((value) => {
      if (!value) trackEvent("faq_open", { question: item.q });
      return !value;
    });
  };

  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button
        type="button"
        className="faq-q"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {item.q}
        <span className="faq-icon" aria-hidden="true" />
      </button>
      {/* 回答は常にDOMに残し（SEO/クローラ対策）、高さのみアニメーション */}
      <motion.div
        id={panelId}
        className="faq-a"
        initial={false}
        animate={{ height: open ? "auto" : 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        style={{ overflow: "hidden" }}
      >
        <div className="faq-a-inner">{item.a}</div>
      </motion.div>
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" style={{ background: "rgba(42,157,143,.04)" }}>
      <div className="container">
        <div className="section-label">FAQ</div>
        <Reveal dir="up">
          <h2 className="section-title">よくある質問</h2>
        </Reveal>

        <Reveal dir="left">
          <div className="faq-list">
            {ITEMS.map((item) => (
              <FaqItem key={item.q} item={item} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
