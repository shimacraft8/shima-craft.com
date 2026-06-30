'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { reservationConfig } from '../config/reservation'

interface StickyReservationButtonProps {
  finalCtaId: string
}

export default function StickyReservationButton({ finalCtaId }: StickyReservationButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isNearFinalCta, setIsNearFinalCta] = useState(false)

  useEffect(() => {
    // 少しスクロールしたら表示
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300)
    }

    // 最終CTAセクションに近づいたら非表示
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsNearFinalCta(entry.isIntersecting)
        })
      },
      { threshold: 0, rootMargin: '100px 0px 0px 0px' }
    )

    const finalCta = document.getElementById(finalCtaId)
    if (finalCta) observer.observe(finalCta)

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (finalCta) observer.unobserve(finalCta)
    }
  }, [finalCtaId])

  const show = isVisible && !isNearFinalCta

  return (
    <div
      aria-hidden={!show}
      className={`
        fixed bottom-0 left-0 right-0 z-40 md:hidden
        transition-transform duration-300 ease-in-out
        ${show ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="bg-[#F7F5F0] border-t border-[#E8DDD0] px-4 py-3 safe-area-inset-bottom">
        <Link
          href={reservationConfig.bookingUrl}
          tabIndex={show ? 0 : -1}
          className="btn-primary w-full text-center justify-center"
          aria-label={`${reservationConfig.stickyCtaLabel}（${reservationConfig.externalNotice}）`}
        >
          {reservationConfig.stickyCtaLabel}
          <ChevronRight size={16} aria-hidden />
        </Link>
        <p className="text-center text-[10px] text-[#6B6460] mt-1">
          {reservationConfig.externalNotice}
        </p>
      </div>
    </div>
  )
}
