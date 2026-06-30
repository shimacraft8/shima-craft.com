'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { planConfig } from '../config/plan'

function FaqItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const contentId = `faq-answer-${id}`
  const buttonId = `faq-button-${id}`

  return (
    <div className="border-b border-[#E8DDD0]">
      <h3>
        <button
          id={buttonId}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-4 py-5 text-left group"
        >
          <span className="text-[#2A2A2A] text-sm md:text-base font-sans font-medium group-hover:text-[#2D5A5A] transition-colors leading-snug">
            {q}
          </span>
          <ChevronDown
            size={18}
            className={`text-[#2D5A5A] flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        ref={contentRef}
        className={`overflow-hidden transition-all duration-300 ${open ? 'pb-5' : ''}`}
      >
        <p className="text-[#6B6460] text-sm font-sans leading-relaxed pl-0 pr-8">
          {a}
        </p>
      </div>
    </div>
  )
}

export default function FaqSection() {
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
      { threshold: 0.05 }
    )

    elements.forEach((el) => observer.observe(el))
    return () => elements.forEach((el) => observer.unobserve(el))
  }, [])

  return (
    <section id="faq" ref={sectionRef} className="bg-[#F7F5F0] section-padding">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <p className="fade-in-item section-subtitle mb-3">FAQ</p>
        <h2 className="fade-in-item section-title mb-8" style={{ transitionDelay: '0.1s' }}>
          よくある質問
        </h2>

        {/* FAQ一覧 */}
        <div className="fade-in-item border-t border-[#E8DDD0]" style={{ transitionDelay: '0.15s' }}>
          {planConfig.faqs.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} id={String(i)} />
          ))}
        </div>

        {/* その他の質問 */}
        <p className="fade-in-item mt-8 text-[#6B6460] text-sm font-sans text-center" style={{ transitionDelay: '0.25s' }}>
          その他のご質問は、予約ページのお問い合わせフォームよりご連絡ください。
        </p>
      </div>
    </section>
  )
}
