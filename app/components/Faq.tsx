"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/app/components/Reveal";

type Item = { q: string; a: string };

const ITEMS: Item[] = [
  {
    q: "見積もりは有料ですか？",
    a: "いいえ、ご相談・お見積もりはすべて無料です。ご相談の中で、ご要望に合わせた簡易的なサンプルサイトをお出しすることも可能です。完成イメージを見てから判断していただけるので、まずはお気軽にご連絡ください。",
  },
  {
    q: "撮影の対応エリアはどこまでですか？",
    a: "奄美大島を中心に対応しています。奄美大島以外での撮影が必要な場合は、別途出張費・交通費などの追加費用がかかります。費用は撮影内容によって変わりますので、お見積もり時に明確にご案内します。",
  },
  {
    q: "月額保守プランにはどこまで含まれますか？",
    a: "月額4,800円でHP維持・SSL管理・セキュリティ更新・月1回の軽微な修正（営業時間・料金・文言変更など）が含まれます。ページ追加・大幅なデザイン変更・写真撮影・動画制作は別途お見積もりになります。Googleマップ管理（口コミ返信・写真追加・投稿代行）は月額3,000円で追加できます。",
  },
  {
    q: "じゃらんやホットペッパーの登録もお願いできますか？",
    a: "はい。じゃらん・ホットペッパー・Googleマップ・公式LINEなど、ネット集客まわりの登録や初期構築をまるごと代行します（登録・構築 30,000円〜）。登録後の継続的な更新・運用は月額保守プランでサポートできますので、あわせてご相談ください。",
  },
  {
    q: "制作期間はどのくらいかかりますか？",
    a: "内容によりますが、HP制作はおおよそ2〜3週間を目安にしています。写真・空撮撮影を含む場合は天候の影響を受けることもあるため、スケジュールに余裕をもってご相談いただけると安心です。お急ぎの場合もまずはご相談ください。",
  },
];

function FaqItem({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button
        type="button"
        className="faq-q"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
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
