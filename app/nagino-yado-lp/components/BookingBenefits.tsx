'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Clock, Gift, Map, Package, Percent, type LucideIcon
} from 'lucide-react'
import { planConfig } from '../config/plan'
import { mediaAssets } from '../lib/media'

const iconMap: Record<string, LucideIcon> = {
  clock: Clock,
  gift: Gift,
  map: Map,
  package: Package,
  percent: Percent,
}

export default function BookingBenefits() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section || reducedMotion) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.load()
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.3 }
    )

    observer.observe(section)
    const handleCanPlay = () => setVideoLoaded(true)
    video.addEventListener('canplay', handleCanPlay)

    return () => {
      observer.unobserve(section)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [reducedMotion])

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
    <section id="benefits" ref={sectionRef} className="relative overflow-hidden">
      {/* 背景（Scene C動画または静止画） */}
      <div className="absolute inset-0">
        <Image
          src={mediaAssets.evening.poster}
          alt={mediaAssets.evening.alt}
          fill
          sizes="100vw"
          className={`object-cover transition-opacity duration-700 ${videoLoaded && !reducedMotion ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectPosition: 'center 60%' }}
          loading="lazy"
        />
        {!reducedMotion && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            src={mediaAssets.evening.video}
            poster={mediaAssets.evening.poster}
            muted
            playsInline
            autoPlay
            loop
            preload="none"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 bg-[#1E3F3F]/80" aria-hidden />
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 section-padding">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <p className="fade-in-item section-subtitle text-[#E8DDD0]/60 mb-3">
            Official booking exclusive
          </p>
          <h2 className="fade-in-item text-[#F7F5F0] text-2xl md:text-3xl font-serif mb-8 tracking-wide" style={{ transitionDelay: '0.1s' }}>
            公式予約限定の特典
          </h2>

          {/* 特典リスト */}
          <div className="space-y-5">
            {planConfig.benefits.map((benefit, i) => {
              const Icon = iconMap[benefit.icon] ?? Package
              return (
                <div
                  key={benefit.title}
                  className="fade-in-item flex gap-4 bg-white/5 border border-white/10 px-5 py-4"
                  style={{ transitionDelay: `${0.15 + i * 0.08}s` }}
                >
                  <Icon size={20} className="text-[#E8DDD0]/80 flex-shrink-0 mt-0.5" aria-hidden />
                  <div>
                    <h3 className="text-[#F7F5F0] font-medium text-sm mb-1 font-sans">{benefit.title}</h3>
                    <p className="text-[#E8DDD0]/70 text-xs leading-relaxed font-sans">{benefit.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 注記 */}
          <p className="fade-in-item mt-8 text-[#E8DDD0]/50 text-xs font-sans" style={{ transitionDelay: '0.6s' }}>
            ※ 上記特典は本LPからのご予約（連泊プラン）に限ります。<br />
            旅行サイト・他プランではご利用いただけません。
          </p>
        </div>
      </div>
    </section>
  )
}
