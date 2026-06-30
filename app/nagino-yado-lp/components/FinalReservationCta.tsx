'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { siteConfig } from '../config/site'
import { reservationConfig } from '../config/reservation'
import { planConfig } from '../config/plan'

export default function FinalReservationCta() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const elements = sectionRef.current?.querySelectorAll<HTMLElement>('.fade-in-item')
    if (!elements) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).classList.add('is-visible')
          }
        })
      },
      { threshold: 0.1 }
    )

    elements.forEach((el) => observer.observe(el))
    return () => elements.forEach((el) => observer.unobserve(el))
  }, [])

  return (
    <section
      id="final-cta"
      ref={sectionRef}
      className="bg-[#2D5A5A] section-padding"
      aria-label="予約セクション"
    >
      <div className="max-w-xl mx-auto text-center">
        {/* 施設名 */}
        <p className="fade-in-item text-[#E8DDD0]/60 text-xs tracking-[0.25em] uppercase mb-4 font-sans">
          {siteConfig.name}
        </p>

        {/* キャッチコピー */}
        <h2 className="fade-in-item text-[#F7F5F0] text-2xl md:text-3xl font-serif tracking-wide leading-relaxed mb-4" style={{ transitionDelay: '0.1s' }}>
          予定を詰め込まない、<br />
          {planConfig.nights}泊{planConfig.days}日の島時間。
        </h2>

        {/* 料金サマリー */}
        <p className="fade-in-item text-[#E8DDD0]/80 text-sm font-sans mb-10" style={{ transitionDelay: '0.2s' }}>
          {planConfig.nights}泊{planConfig.days}日・2名 /{' '}
          <span className="text-[#F7F5F0] font-medium">
            {planConfig.pricing.basePriceLabel}（税込）
          </span>
        </p>

        {/* メインCTA */}
        <div className="fade-in-item space-y-3" style={{ transitionDelay: '0.25s' }}>
          <Link
            href={reservationConfig.bookingUrl}
            className="btn-primary bg-[#F7F5F0] text-[#2D5A5A] hover:bg-[#E8DDD0] w-full sm:w-auto justify-center"
            aria-label={`${reservationConfig.ctaLabel}（${reservationConfig.externalNotice}）`}
          >
            {reservationConfig.ctaLabel}
            <ChevronRight size={16} aria-hidden />
          </Link>

          {/* サブCTA */}
          <div>
            <Link
              href={reservationConfig.bookingUrl}
              className="inline-flex items-center gap-1.5 text-[#E8DDD0]/70 text-sm hover:text-[#E8DDD0] transition-colors font-sans underline underline-offset-4"
              aria-label={`${reservationConfig.ctaSubLabel}（${reservationConfig.externalNotice}）`}
            >
              {reservationConfig.ctaSubLabel}
              <ExternalLink size={12} aria-hidden />
            </Link>
          </div>
        </div>

        {/* 外部遷移の注記 */}
        <p className="fade-in-item mt-5 text-[#E8DDD0]/50 text-xs font-sans" style={{ transitionDelay: '0.35s' }}>
          {reservationConfig.externalNotice}
        </p>

        {/* 特典リマインダー */}
        <div className="fade-in-item mt-8 pt-8 border-t border-white/10" style={{ transitionDelay: '0.4s' }}>
          <p className="text-[#E8DDD0]/60 text-xs font-sans mb-3">公式予約限定特典</p>
          <div className="flex flex-wrap justify-center gap-2">
            {planConfig.benefits.map((b) => (
              <span key={b.title} className="text-[11px] text-[#E8DDD0]/70 bg-white/5 border border-white/10 px-3 py-1 font-sans">
                {b.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
