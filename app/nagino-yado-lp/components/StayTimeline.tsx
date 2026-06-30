'use client'

import { useEffect, useRef } from 'react'
import { planConfig } from '../config/plan'

export default function StayTimeline() {
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
    <section id="timeline" ref={sectionRef} className="bg-[#1E3F3F] section-padding">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-12 md:mb-16">
          <p className="fade-in-item section-subtitle text-[#E8DDD0]/60 mb-3">Stay experience</p>
          <h2 className="fade-in-item text-[#F7F5F0] text-2xl md:text-3xl font-serif tracking-wide" style={{ transitionDelay: '0.1s' }}>
            {planConfig.nights}泊{planConfig.days}日の過ごし方
          </h2>
          <p className="fade-in-item text-[#E8DDD0]/70 text-sm mt-3 font-sans leading-relaxed" style={{ transitionDelay: '0.2s' }}>
            予定はあくまで例です。<br />
            宿にいるだけで、それ以上の1日になることもあります。
          </p>
        </div>

        {/* タイムライン */}
        <div className="space-y-12 md:space-y-16">
          {planConfig.timeline.map((day, dayIndex) => (
            <div key={day.day} className="fade-in-item relative" style={{ transitionDelay: `${0.2 + dayIndex * 0.15}s` }}>
              {/* 縦ライン（最後以外） */}
              {dayIndex < planConfig.timeline.length - 1 && (
                <div
                  className="absolute left-[19px] top-12 bottom-[-48px] md:bottom-[-64px] w-px bg-[#2D5A5A]/40"
                  aria-hidden
                />
              )}

              <div className="flex gap-5 md:gap-6">
                {/* 日付バッジ */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full border border-[#2D5A5A]/60 flex items-center justify-center">
                    <span className="text-[#E8DDD0] text-xs font-serif">{day.day}</span>
                  </div>
                </div>

                {/* コンテンツ */}
                <div className="flex-1 pb-2">
                  <p className="text-[#E8DDD0]/50 text-[11px] tracking-widest uppercase font-sans mb-1">
                    {day.label}
                  </p>
                  <h3 className="text-[#F7F5F0] text-lg md:text-xl font-serif mb-4 leading-snug">
                    {day.title}
                  </h3>
                  <ul className="space-y-2">
                    {day.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[#E8DDD0]/70 text-sm font-sans">
                        <span className="mt-2 w-1 h-1 rounded-full bg-[#2D5A5A]/60 flex-shrink-0" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 補足 */}
        <p className="fade-in-item mt-12 text-[#E8DDD0]/40 text-xs font-sans text-center tracking-wide">
          — タイムラインはあくまで参考例です —
        </p>
      </div>
    </section>
  )
}
