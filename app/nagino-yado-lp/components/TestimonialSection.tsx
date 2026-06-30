'use client'

import { useEffect, useRef } from 'react'
import { planConfig } from '../config/plan'

export default function TestimonialSection() {
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
      { threshold: 0.08 }
    )

    elements.forEach((el) => observer.observe(el))
    return () => elements.forEach((el) => observer.unobserve(el))
  }, [])

  return (
    <section id="testimonials" ref={sectionRef} className="bg-[#F7F5F0] section-padding">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-10 text-center">
          <p className="fade-in-item section-subtitle mb-3">Stay stories</p>
          <h2 className="fade-in-item section-title" style={{ transitionDelay: '0.1s' }}>
            滞在者の声
          </h2>
          {/* デモ明記 */}
          <p className="fade-in-item mt-3 text-[11px] text-[#6B6460]/70 font-sans border border-[#E8DDD0] inline-block px-4 py-1" style={{ transitionDelay: '0.2s' }}>
            デモ用の滞在イメージです。実際の口コミではありません。
          </p>
        </div>

        {/* レビューカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planConfig.testimonials.map((item, i) => (
            <figure
              key={i}
              className="fade-in-item bg-white border border-[#E8DDD0] p-6"
              style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
            >
              {/* 引用符 */}
              <div className="text-4xl text-[#2D5A5A]/20 font-serif leading-none mb-3" aria-hidden>
                &ldquo;
              </div>
              <blockquote>
                <p className="text-[#6B6460] text-sm leading-relaxed font-sans mb-4">
                  {item.text}
                </p>
                <figcaption className="text-xs text-[#6B6460]/60 font-sans">
                  — {item.author}
                </figcaption>
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
