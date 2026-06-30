'use client'

import { useEffect, useRef } from 'react'
import { Car, Plane, MapPin } from 'lucide-react'
import { siteConfig } from '../config/site'

export default function AccessSection() {
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
    <section id="access" ref={sectionRef} className="bg-[#E8DDD0]/20 section-padding">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <p className="fade-in-item section-subtitle mb-3">Access</p>
        <h2 className="fade-in-item section-title mb-8" style={{ transitionDelay: '0.1s' }}>
          アクセス
        </h2>

        {/* アクセス情報カード */}
        <div className="fade-in-item bg-white border border-[#E8DDD0] p-6 md:p-8 space-y-6" style={{ transitionDelay: '0.15s' }}>
          {/* 場所 */}
          <div className="flex gap-4">
            <MapPin size={18} className="text-[#2D5A5A] flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-xs text-[#6B6460] tracking-wider uppercase mb-1 font-sans">所在地</p>
              <p className="text-[#2A2A2A] font-medium font-sans">{siteConfig.location}</p>
            </div>
          </div>

          {/* 飛行機 */}
          <div className="flex gap-4">
            <Plane size={18} className="text-[#2D5A5A] flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-xs text-[#6B6460] tracking-wider uppercase mb-1 font-sans">最寄り空港</p>
              <p className="text-[#2A2A2A] font-medium font-sans">奄美空港</p>
              <p className="text-[#6B6460] text-sm font-sans mt-0.5">
                大阪（伊丹）・東京（羽田）から直行便あり
              </p>
            </div>
          </div>

          {/* 車 */}
          <div className="flex gap-4">
            <Car size={18} className="text-[#2D5A5A] flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-xs text-[#6B6460] tracking-wider uppercase mb-1 font-sans">空港から</p>
              <p className="text-[#2A2A2A] font-medium font-sans">{siteConfig.accessFromAirport}</p>
              <p className="text-[#6B6460] text-sm font-sans mt-0.5">
                レンタカーのご利用を強くおすすめします。
              </p>
            </div>
          </div>

          {/* 駐車場 */}
          <div className="border-t border-[#E8DDD0] pt-5">
            <p className="text-[#2A2A2A] text-sm font-medium font-sans mb-1">{siteConfig.parking}</p>
            <p className="text-[#6B6460] text-xs font-sans">
              無料でご利用いただけます（事前予約不要）
            </p>
          </div>
        </div>

        {/* レンタカー案内 */}
        <div className="fade-in-item mt-5 bg-[#2D5A5A]/5 border border-[#2D5A5A]/20 px-5 py-4" style={{ transitionDelay: '0.25s' }}>
          <p className="text-[#2D5A5A] text-sm font-medium font-sans mb-1">奄美大島はレンタカーが必須です</p>
          <p className="text-[#6B6460] text-xs font-sans leading-relaxed">
            バスの本数が限られるため、島内を自由に移動するにはレンタカーをご用意ください。
            空港周辺に主要なレンタカー会社が揃っています。
          </p>
        </div>

        {/* 架空設定の注記 */}
        <p className="fade-in-item mt-4 text-[11px] text-[#6B6460]/60 font-sans text-center" style={{ transitionDelay: '0.3s' }}>
          ※ 上記は架空施設のデモ設定です。実在の住所ではありません。
        </p>
      </div>
    </section>
  )
}
