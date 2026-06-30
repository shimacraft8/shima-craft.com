'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { siteConfig } from '../config/site'
import { reservationConfig } from '../config/reservation'
import { mediaAssets } from '../lib/media'

export default function HeroExperience() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)
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
    if (!video || reducedMotion) return

    const handleCanPlay = () => setVideoReady(true)
    video.addEventListener('canplay', handleCanPlay)

    // 遅延読み込み：ページロード直後は少し待つ
    const timer = setTimeout(() => {
      if (video.readyState >= 3) setVideoReady(true)
      video.play().catch(() => {
        // 自動再生失敗時はposter画像を表示継続
      })
    }, 100)

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      clearTimeout(timer)
    }
  }, [reducedMotion])

  return (
    <section
      className="relative w-full h-screen min-h-[600px] max-h-[900px] flex flex-col justify-end overflow-hidden"
      aria-label="凪ノ宿 AMAMI — メインビジュアル"
    >
      {/* 背景：動画またはposter静止画 */}
      <div className="absolute inset-0">
        {/* Poster画像（動画読み込み前・reduced-motion時） */}
        <Image
          src={mediaAssets.hero.poster}
          alt={mediaAssets.hero.alt}
          fill
          priority
          sizes="100vw"
          className={`object-cover transition-opacity duration-700 ${videoReady && !reducedMotion ? 'opacity-0' : 'opacity-100'}`}
          style={{ objectPosition: 'center 60%' }}
        />

        {/* 動画（reduced-motionでは非表示） */}
        {!reducedMotion && (
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
            src={mediaAssets.hero.video}
            poster={mediaAssets.hero.poster}
            muted
            playsInline
            autoPlay
            loop
            preload="none"
            aria-hidden
          />
        )}

        {/* オーバーレイ：コントラスト確保 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" aria-hidden />
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 px-6 pb-16 md:px-16 md:pb-20 lg:px-24">
        {/* 小さなラベル */}
        <p className="text-[#E8DDD0] text-xs tracking-[0.25em] uppercase mb-4 font-sans">
          {siteConfig.planName}
        </p>

        {/* 施設名 */}
        <h1 className="text-white text-3xl md:text-5xl lg:text-6xl font-serif leading-tight mb-3 tracking-wide">
          {siteConfig.name}
        </h1>

        {/* キャッチコピー */}
        <p className="text-white/90 text-lg md:text-2xl font-serif mb-8 tracking-wide">
          {siteConfig.tagline}
        </p>

        {/* CTAボタン */}
        <div className="flex flex-col xs:flex-row gap-3 items-start">
          <Link
            href={reservationConfig.bookingUrl}
            className="btn-primary"
            aria-label={`${reservationConfig.ctaLabel}（${reservationConfig.externalNotice}）`}
          >
            {reservationConfig.ctaLabel}
          </Link>
          <a
            href="#plan"
            className="btn-outline border-white/70 text-white hover:bg-white/10 hover:text-white"
          >
            プランを見る
          </a>
        </div>

        <p className="mt-3 text-white/60 text-[11px] font-sans">
          ※ {reservationConfig.externalNotice}
        </p>
      </div>

      {/* スクロール誘導 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <a
          href="#plan"
          aria-label="プランセクションへスクロール"
          className="flex flex-col items-center gap-1 text-white/60 hover:text-white/90 transition-colors"
        >
          <span className="text-[10px] tracking-widest uppercase font-sans">Scroll</span>
          <ChevronDown size={16} aria-hidden />
        </a>
      </div>
    </section>
  )
}
