"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { mailtoHref } from "@/app/lib/site";

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: "easeOut", delay },
  }),
};

export function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // 緩やかなパララックス（HTMLの background-position-y シフトを再現）
  const y = useTransform(scrollY, [0, 800], ["0%", "12%"]);

  return (
    <section className="hero" id="top">
      <motion.div className="hero-bg" style={reduce ? undefined : { y }}>
        <Image
          src="/hero.jpg"
          alt="奄美大島の海岸線を捉えた空撮写真"
          fill
          priority
          sizes="100vw"
          quality={85}
        />
      </motion.div>

      <div className="hero-inner">
        <motion.h1
          custom={0.2}
          variants={fadeUp}
          initial={reduce ? "show" : "hidden"}
          animate="show"
        >
          島の魅力を、もっと世界へ。
        </motion.h1>
        <motion.p
          custom={0.4}
          variants={fadeUp}
          initial={reduce ? "show" : "hidden"}
          animate="show"
        >
          鹿児島・離島の事業者さんのWeb制作・撮影・映像制作を、まるごとサポートします。
        </motion.p>
        <motion.a
          href={mailtoHref}
          className="btn"
          custom={0.6}
          variants={fadeUp}
          initial={reduce ? "show" : "hidden"}
          animate="show"
        >
          まずは相談する
        </motion.a>
      </div>

      <div className="scroll-ind">
        <span>SCROLL</span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div className="wave wave-2" aria-hidden="true">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#FAF7F2"
            d="M0,70 C260,30 520,110 760,70 C1000,30 1220,100 1440,60 L1440,120 L0,120 Z"
          />
        </svg>
      </div>
      <div className="wave wave-1" aria-hidden="true">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#FAF7F2"
            d="M0,60 C240,110 480,10 720,50 C960,90 1200,20 1440,60 L1440,120 L0,120 Z"
          />
        </svg>
      </div>
    </section>
  );
}
