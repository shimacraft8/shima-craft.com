"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { Reveal } from "@/app/components/Reveal";

type Step = { n: number; title: string; sub: string };

const STEPS: Step[] = [
  { n: 1, title: "状況の確認", sub: "困りごとを伺います" },
  { n: 2, title: "内容の整理", sub: "必要な制作内容を確認" },
  { n: 3, title: "進め方の提案", sub: "画面や構成を共有" },
  { n: 4, title: "制作・確認", sub: "公開に向けて調整" },
];

/** 0→N へ 180ms 刻みでカウントアップする数字バッジ（HTMLの挙動を踏襲） */
function FlowNum({ target }: { target: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      current += 1;
      setValue(current);
      if (current < target) timer = setTimeout(step, 180);
    };
    step();
    return () => clearTimeout(timer);
  }, [inView, target]);

  return (
    <div className="flow-num" ref={ref}>
      {value}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flow-arrow" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" y1="12" x2="19" y2="12" />
        <polyline points="13 6 19 12 13 18" />
      </svg>
    </div>
  );
}

export function Flow() {
  return (
    <section id="flow" style={{ background: "rgba(244,162,97,.05)" }}>
      <div className="container">
        <div className="section-label">Flow</div>
        <Reveal dir="up">
          <h2 className="section-title">相談から制作までの流れ</h2>
        </Reveal>

        <Reveal dir="right">
          <div className="flow">
            {STEPS.map((s, i) => (
              <Fragment key={s.n}>
                <div className="flow-step">
                  <FlowNum target={s.n} />
                  <h4>{s.title}</h4>
                  <p>{s.sub}</p>
                </div>
                {i < STEPS.length - 1 && <Arrow />}
              </Fragment>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
