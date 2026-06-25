"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function AkachanRacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="ar-root">
      {/* Fixed Header */}
      <header className={`ar-header${scrolled ? " scrolled" : ""}`}>
        <span className="ar-header-title">赤ちゃんハイハイレース</span>
        <a href="mailto:amami@npo-kenkoudotakara.or.jp" className="ar-header-cta">
          申し込む
        </a>
      </header>

      {/* ── HERO ── */}
      <section className="ar-hero">
        <video
          ref={videoRef}
          className="ar-hero-video"
          src="/akachan-race-2026.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="ar-hero-overlay" />
        <div className="ar-hero-inner">
          <span className="ar-hero-venue">奄美体験交流館</span>
          <h1 className="ar-hero-title">
            赤ちゃん<br />ハイハイレース
          </h1>
          <p className="ar-hero-date">
            2026.6.21&nbsp;<span style={{ fontSize: "0.72em", opacity: 0.8 }}>(SUN)</span>
          </p>
          <p className="ar-hero-time">10:00 – 12:00</p>
          <a href="mailto:amami@npo-kenkoudotakara.or.jp" className="ar-hero-btn">
            申し込む
          </a>
        </div>
        <div className="ar-scroll-ind">
          <span>SCROLL</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Wave bottom */}
        <div style={{ position: "absolute", bottom: -2, left: 0, width: "100%", zIndex: 2 }}>
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#FFFBF0" />
          </svg>
        </div>
      </section>

      {/* ── DETAILS ── */}
      <section className="ar-section" style={{ position: "relative", overflow: "hidden" }}>
        <div className="ar-dot" style={{ width: 300, height: 300, background: "#FF7E8B", top: -80, right: -80 }} />
        <div className="ar-dot" style={{ width: 200, height: 200, background: "#FFD166", bottom: -60, left: -60 }} />

        <div className="ar-container">
          <span className="ar-section-label">Event Details</span>
          <h2 className="ar-section-title">イベント詳細</h2>

          <div className="ar-cards">
            {[
              { emoji: "👶", label: "対象", value: "ハイハイが出来る\n未歩行の赤ちゃん" },
              { emoji: "👨‍👩‍👧", label: "定員", value: "25組\n（先着順）" },
              { emoji: "💴", label: "参加料", value: "¥1,500\n（お一人様）" },
              { emoji: "📅", label: "締切", value: "2026年6月15日\n（月）" },
            ].map((item) => (
              <div className="ar-card" key={item.label}>
                <span className="ar-card-emoji">{item.emoji}</span>
                <span className="ar-card-label">{item.label}</span>
                <p className="ar-card-value">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="ar-prize">
            <p className="ar-prize-title">🎁 うれしい景品もあるよ！</p>
            <p className="ar-prize-text">
              参加者全員に素敵なプレゼントをご用意しています。<br />
              ゴールした赤ちゃんみんなが主役です！
            </p>
          </div>
        </div>
      </section>

      {/* ── APPLY ── */}
      <section className="ar-section ar-apply-bg">
        <div className="ar-container">
          <span className="ar-section-label">How to Apply</span>
          <h2 className="ar-section-title">申し込み方法</h2>

          <div className="ar-apply-grid">
            <a
              href="https://www.instagram.com/kenkoudotakara.amami/"
              target="_blank"
              rel="noopener noreferrer"
              className="ar-apply-card ar-apply-card-ig"
            >
              <span className="ar-apply-icon">📸</span>
              <p className="ar-apply-method">公式 Instagram の DM</p>
              <p className="ar-apply-detail">@KENKOUDOTAKARA.AMAMI</p>
            </a>

            <a
              href="mailto:amami@npo-kenkoudotakara.or.jp"
              className="ar-apply-card ar-apply-card-mail"
            >
              <span className="ar-apply-icon">✉️</span>
              <p className="ar-apply-method">メール</p>
              <p className="ar-apply-detail">amami@npo-kenkoudotakara.or.jp</p>
            </a>
          </div>

          <p className="ar-apply-note">
            定員になり次第、締め切らせていただきます。<br />
            お早めにお申し込みください。
          </p>
        </div>
      </section>

      {/* ── ORGANIZER ── */}
      <section className="ar-organizer">
        <p className="ar-org-label">主催</p>
        <p className="ar-org-name">NPO法人 健康ど宝</p>
        <p className="ar-org-sub">奄美体験交流館</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="ar-footer">
        <p>
          © 2026 NPO法人健康ど宝 &nbsp;|&nbsp; 制作：
          <Link href="/">SHIMA CRAFT</Link>
        </p>
      </footer>
    </div>
  );
}
