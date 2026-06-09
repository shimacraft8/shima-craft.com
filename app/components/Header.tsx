"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const NAV = [
  { href: "#about", label: "ABOUT" },
  { href: "#service", label: "SERVICE" },
  { href: "#works", label: "WORKS" },
  { href: "#flow", label: "FLOW" },
  { href: "#price", label: "PRICE" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "CONTACT" },
] as const;

/**
 * グラスモーフィズムのヘッダー。
 * スクロール量が40pxを超えたら `scrolled` を付与し、背景を半透明＋blur に、
 * ロゴを白版→カラー版に切り替える（CSS側で opacity を制御）。
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <a className="logo" href="#top" aria-label="SHIMA CRAFT ホーム">
        <Image
          className="logo-img logo-white"
          src="/logo-white.png"
          alt="SHIMA CRAFT"
          width={170}
          height={38}
          priority
        />
        <Image
          className="logo-img logo-color"
          src="/logo.png"
          alt="SHIMA CRAFT"
          width={170}
          height={38}
          priority
        />
      </a>
      <nav className="site-nav" aria-label="グローバルナビゲーション">
        {NAV.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
