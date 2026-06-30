'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { planConfig } from '../config/plan'
import { reservationConfig } from '../config/reservation'

export default function PricingSection() {
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
    <section id="pricing" ref={sectionRef} className="bg-[#E8DDD0]/30 section-padding">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <p className="fade-in-item section-subtitle mb-3">Pricing</p>
        <h2 className="fade-in-item section-title mb-8" style={{ transitionDelay: '0.1s' }}>
          料金の目安
        </h2>

        {/* 料金ブロック */}
        <div className="fade-in-item bg-white border border-[#E8DDD0] p-8 md:p-10" style={{ transitionDelay: '0.15s' }}>
          {/* プラン名 */}
          <p className="text-xs tracking-widest text-[#6B6460] uppercase mb-4 font-sans">
            島暮らし連泊プラン / {planConfig.targetGuests}
          </p>

          {/* 価格表示 */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl md:text-5xl font-serif text-[#2D5A5A] font-medium">
              ¥{planConfig.pricing.basePrice.toLocaleString()}
            </span>
            <span className="text-[#6B6460] text-sm font-sans">〜</span>
          </div>
          <p className="text-[#6B6460] text-sm font-sans mb-1">
            {planConfig.nights}泊{planConfig.days}日・2名利用合計
          </p>
          <p className="text-[#6B6460] text-xs font-sans mb-6">
            （{planConfig.pricing.taxNote}）
          </p>

          {/* 内訳 */}
          <div className="border-t border-[#E8DDD0] pt-5 mb-6">
            <div className="flex justify-between items-center py-2 text-sm font-sans">
              <span className="text-[#6B6460]">1泊あたり（2名）</span>
              <span className="text-[#2A2A2A] font-medium">{planConfig.pricing.perNight}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm font-sans">
              <span className="text-[#6B6460]">連泊割引</span>
              <span className="text-[#2D5A5A] font-medium">適用済み</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm font-sans">
              <span className="text-[#6B6460]">食事</span>
              <span className="text-[#2A2A2A]">なし（自炊・外食）</span>
            </div>
          </div>

          {/* 注意書き */}
          <p className="text-[#6B6460] text-xs font-sans leading-relaxed mb-6">
            {planConfig.pricing.note}
          </p>

          {/* CTAボタン */}
          <Link
            href={reservationConfig.bookingUrl}
            className="btn-primary w-full justify-center"
            aria-label={`${reservationConfig.ctaLabel}（${reservationConfig.externalNotice}）`}
          >
            {reservationConfig.ctaLabel}
            <ChevronRight size={16} aria-hidden />
          </Link>
          <p className="text-center text-[11px] text-[#6B6460] mt-2 font-sans">
            {reservationConfig.externalNotice}
          </p>
        </div>

        {/* デモ注記 */}
        <p className="fade-in-item mt-4 text-center text-[11px] text-[#6B6460]/70 font-sans" style={{ transitionDelay: '0.25s' }}>
          ※ 掲載料金はデモ用の架空数値です。実際の料金は予約ページでご確認ください。
        </p>
      </div>
    </section>
  )
}
