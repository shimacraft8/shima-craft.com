"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./page.css";

export default function MokkoCenterPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mc-root">
      {/* ── HEADER ── */}
      <header className={`mc-header${scrolled ? " scrolled" : ""}`}>
        <div className="mc-header-logo">
          <span className="mc-header-logo-ja">木工センター</span>
        </div>
        <a href="tel:0997695015" className="mc-header-cta">
          お電話でご予約
        </a>
      </header>

      {/* ── HERO ── */}
      <section className="mc-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mokko-center/gallery-3.jpg" alt="" className="mc-hero-bg-img" aria-hidden="true" />
        <div className="mc-hero-overlay" aria-hidden="true" />
        <div className="mc-hero-inner">
          <span className="mc-hero-badge">奄美市住用木工工芸センター</span>
          <h1 className="mc-hero-title">
            リュウキュウマツで<br />木工芸品を体験
          </h1>
          <p className="mc-hero-sub">
            美しい木目と木の香りに包まれながら、<br className="mc-br-pc" />
            あなただけの一枚を生み出しましょう。
          </p>
          <div className="mc-hero-btns">
            <a href="tel:0997695015" className="mc-hero-btn-primary">
              電話で予約する
            </a>
            <a href="#courses" className="mc-hero-btn-secondary">
              コースを見る
            </a>
          </div>
        </div>

        <div className="mc-scroll-ind" aria-hidden="true">
          <span>SCROLL</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12l7 7 7-7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="mc-hero-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path
              d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,20 1440,40 L1440,80 L0,80 Z"
              fill="#FAF6F0"
            />
          </svg>
        </div>
      </section>

      {/* ── INFO STRIP ── */}
      <div className="mc-info-strip">
        <div className="mc-info-strip-inner">
          {[
            { label: "営業時間", text: "9:30 〜 17:30" },
            { label: "定休日", text: "水・木曜日" },
            { label: "電話", text: "0997-69-5015" },
            { label: "奄美空港から", text: "車で約65分" },
          ].map((item) => (
            <div className="mc-info-item" key={item.text}>
              <span className="mc-info-label">{item.label}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <section className="mc-section mc-about" id="about">
        <div className="mc-container">
          <span className="mc-section-label">About</span>
          <h2 className="mc-section-title">センターについて</h2>

          <div className="mc-about-grid">
            <div className="mc-about-text-col">
              <p>
                奄美市住用木工工芸センターでは、地元特産の<strong>リュウキュウマツ</strong>を使った
                木工芸品の製作を行っています。木目の美しいリュウキュウマツならではの一枚板や工芸品は、
                木の香りや手触りが温かく、心地よさと安らぎを与えてくれます。
              </p>
              <p>
                木工芸品の製作指導も行っており、<strong>機材持ち込み</strong>で
                ご自身のペースで製作できます。
                初心者からベテランまで、スタッフが丁寧にサポートします。
              </p>
            </div>
            <div className="mc-about-features">
              {[
                {
                  title: "木工芸品の製作",
                  desc: "リュウキュウマツの一枚板を使った美しい家具・工芸品を製作できます。",
                },
                {
                  title: "丁寧な製作指導",
                  desc: "経験豊富なスタッフが初心者から上級者まで対応します。",
                },
                {
                  title: "機材持ち込み可",
                  desc: "専用工房スペースで、ご自身の機材を使った製作が可能です。",
                },
              ].map((f) => (
                <div className="mc-feature-card" key={f.title}>
                  <div>
                    <h3 className="mc-feature-title">{f.title}</h3>
                    <p className="mc-feature-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section className="mc-section mc-gallery-section" id="gallery">
        <div className="mc-container">
          <span className="mc-section-label">Gallery</span>
          <h2 className="mc-section-title">施設・作品ギャラリー</h2>
          <div className="mc-gallery">
            <div className="mc-gallery-item mc-gallery-tall">
              <img src="/mokko-center/gallery-1.jpg" alt="木工工房内部（加工機材）" />
              <span className="mc-gallery-caption">木工工房内部</span>
            </div>
            <div className="mc-gallery-item">
              <img src="/mokko-center/gallery-2.jpg" alt="リュウキュウマツの一枚板" />
              <span className="mc-gallery-caption">リュウキュウマツの一枚板</span>
            </div>
            <div className="mc-gallery-item">
              <img src="/mokko-center/gallery-3.jpg" alt="センター外観" />
              <span className="mc-gallery-caption">センター外観</span>
            </div>
            <div className="mc-gallery-item">
              <img src="/mokko-center/gallery-4.jpg" alt="工房の機材" />
              <span className="mc-gallery-caption">工房の機材</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── COURSES ── */}
      <section className="mc-section mc-courses-section" id="courses">
        <div className="mc-container">
          <span className="mc-section-label">Courses & Fees</span>
          <h2 className="mc-section-title">コース・料金</h2>

          <div className="mc-course-cards">
            {/* 施設利用 */}
            <div className="mc-course-card">
              <div className="mc-course-card-top" style={{ background: "#5C8B5A" }}>
                <span className="mc-course-tag">BASIC</span>
                <h3 className="mc-course-name">施設利用</h3>
                <div className="mc-course-price-wrap">
                  <span className="mc-course-price">¥410</span>
                  <span className="mc-course-price-unit">〜</span>
                </div>
              </div>
              <div className="mc-course-card-body">
                <p className="mc-course-desc">
                  機材をお持ち込みいただき、施設内で自由に木工製作をお楽しみいただけます。
                </p>
                <ul className="mc-course-list">
                  <li>施設・工房スペース利用</li>
                  <li>機材持ち込み可</li>
                  <li>スタッフ常駐</li>
                </ul>
                <a href="tel:0997695015" className="mc-course-btn">
                  電話で予約
                </a>
              </div>
            </div>

            {/* 一般コース */}
            <div className="mc-course-card mc-course-featured">
              <div className="mc-course-featured-badge">人気</div>
              <div className="mc-course-card-top" style={{ background: "#8B6248" }}>
                <span className="mc-course-tag">STANDARD</span>
                <h3 className="mc-course-name">一般コース</h3>
                <div className="mc-course-price-wrap">
                  <span className="mc-course-price">¥3,000</span>
                  <span className="mc-course-price-unit">〜</span>
                </div>
              </div>
              <div className="mc-course-card-body">
                <p className="mc-course-desc">
                  スタッフの丁寧な指導のもと、リュウキュウマツを使った木工芸品の基本を体験できます。
                </p>
                <ul className="mc-course-list">
                  <li>製作指導付き</li>
                  <li>道具の貸し出し</li>
                  <li>初心者歓迎</li>
                  <li>材料費込み</li>
                </ul>
                <a href="tel:0997695015" className="mc-course-btn mc-course-btn-featured">
                  電話で予約
                </a>
              </div>
            </div>

            {/* 本格コース */}
            <div className="mc-course-card">
              <div className="mc-course-card-top" style={{ background: "#C17A2B" }}>
                <span className="mc-course-tag">PREMIUM</span>
                <h3 className="mc-course-name">本格コース</h3>
                <div className="mc-course-price-wrap">
                  <span className="mc-course-price">¥15,000</span>
                  <span className="mc-course-price-unit">〜</span>
                </div>
              </div>
              <div className="mc-course-card-body">
                <p className="mc-course-desc">
                  リュウキュウマツの美しい一枚板を使った、本格的な作品づくりに挑戦できます。
                </p>
                <ul className="mc-course-list">
                  <li>一枚板から選択可</li>
                  <li>専門指導付き</li>
                  <li>仕上げまでサポート</li>
                  <li>記念品・プレゼントに最適</li>
                </ul>
                <a href="tel:0997695015" className="mc-course-btn">
                  電話で予約
                </a>
              </div>
            </div>
          </div>

          <p className="mc-courses-note">
            ※ 料金は目安です。詳細・ご予約はお電話にてお問い合わせください。
          </p>
        </div>
      </section>

      {/* ── ACCESS ── */}
      <section className="mc-section mc-access-section" id="access">
        <div className="mc-container">
          <span className="mc-section-label">Access</span>
          <h2 className="mc-section-title">アクセス・基本情報</h2>

          <div className="mc-access-grid">
            <div className="mc-access-map">
              <iframe
                src="https://maps.google.com/maps?q=鹿児島県奄美市住用町大字摺勝555-10&hl=ja&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="奄美市住用木工工芸センター 地図"
              />
            </div>

            <div className="mc-access-info">
              {[
                {
                  label: "所在地",
                  value: "〒894-1116\n鹿児島県奄美市住用町\n大字摺勝555-10",
                  multiline: true,
                },
                { label: "電話番号", value: "0997-69-5015", link: "tel:0997695015" },
                { label: "営業時間", value: "9:30 〜 17:30" },
                { label: "定休日", value: "水曜日・木曜日" },
                { label: "駐車場", value: "あり" },
                { label: "トイレ", value: "あり" },
                { label: "Wi-Fi", value: "なし" },
                { label: "最寄りバス停", value: "三太郎の里（しまバス）" },
                { label: "奄美空港から", value: "車で約1時間5分" },
              ].map((item) => (
                <div className="mc-access-row" key={item.label}>
                  <span className="mc-access-label">{item.label}</span>
                  {item.link ? (
                    <a href={item.link} className="mc-access-value mc-access-tel">
                      {item.value}
                    </a>
                  ) : (
                    <span
                      className="mc-access-value"
                      style={item.multiline ? { whiteSpace: "pre-line" } : undefined}
                    >
                      {item.value}
                    </span>
                  )}
                </div>
              ))}

              <a
                href="https://maps.app.goo.gl/search/?q=鹿児島県奄美市住用町大字摺勝555-10"
                target="_blank"
                rel="noopener noreferrer"
                className="mc-map-btn"
              >
                Google マップで開く
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mc-cta-section">
        <div className="mc-container">
          <div className="mc-cta-box">
            <h2 className="mc-cta-title">木のぬくもりを感じる体験を</h2>
            <p className="mc-cta-text">
              リュウキュウマツの美しい木目と香りに包まれながら、<br />
              あなただけの木工芸品を作りませんか？
            </p>
            <a href="tel:0997695015" className="mc-cta-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .82h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              0997-69-5015
            </a>
            <p className="mc-cta-hours">受付時間 9:30〜17:30（水・木定休）</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mc-footer">
        <div className="mc-footer-inner">
          <p className="mc-footer-name">奄美市住用木工工芸センター</p>
          <p className="mc-footer-address">
            〒894-1116 鹿児島県奄美市住用町大字摺勝555-10
          </p>
          <p className="mc-footer-tel">
            <a href="tel:0997695015">0997-69-5015</a>
          </p>
        </div>
        <p className="mc-footer-copy">
          © 2025 奄美市住用木工工芸センター &nbsp;|&nbsp; 制作：
          <Link href="/">SHIMA CRAFT</Link>
        </p>
      </footer>
    </div>
  );
}
