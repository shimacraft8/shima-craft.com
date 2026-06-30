'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { mediaAssets } from '../lib/media'

export default function InteriorExperience() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
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
            // 動画を読み込んで再生
            video.load()
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.4 }
    )

    observer.observe(section)

    const handleCanPlay = () => setVideoLoaded(true)
    video.addEventListener('canplay', handleCanPlay)

    return () => {
      observer.unobserve(section)
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [reducedMotion])

  // テキストのフェードイン
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
      ref={sectionRef}
      className="relative bg-[#2A2A2A] overflow-hidden"
      aria-label="宿の空間体験"
    >
      {/* 上部コピー */}
      <div className="px-6 pt-16 pb-10 md:px-16 md:pt-24 md:pb-14 text-center">
        <p className="fade-in-item section-subtitle text-[#E8DDD0]/60 mb-4">
          Experience
        </p>
        <h2 className="fade-in-item text-[#F7F5F0] text-2xl md:text-3xl font-serif tracking-wide leading-relaxed" style={{ transitionDelay: '0.15s' }}>
          予定を詰め込まない旅へ。
        </h2>
      </div>

      {/* 動画エリア */}
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] max-h-[65vh]">
        {/* Poster画像 */}
        <Image
          src={mediaAssets.interior.poster}
          alt={mediaAssets.interior.alt}
          fill
          sizes="100vw"
          className={`object-cover transition-opacity duration-700 ${videoLoaded && !reducedMotion ? 'opacity-0' : 'opacity-100'}`}
          loading="lazy"
        />

        {/* 動画 */}
        {!reducedMotion && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            src={mediaAssets.interior.video}
            poster={mediaAssets.interior.poster}
            muted
            playsInline
            autoPlay
            loop
            preload="none"
            aria-hidden
          />
        )}

        {/* 下部グラデーション */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#2A2A2A] to-transparent" aria-hidden />
      </div>

      {/* 下部コピー */}
      <div className="px-6 pt-10 pb-16 md:px-16 md:pb-24 text-center">
        <p className="fade-in-item text-[#F7F5F0]/80 text-base md:text-lg font-serif tracking-wide">
          風の音と、朝の光で目を覚ます。
        </p>
      </div>
    </section>
  )
}
