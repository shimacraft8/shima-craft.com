'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  BedDouble, Sofa, UtensilsCrossed, Wind, Wifi,
  ShowerHead, WashingMachine, Car, Package, Thermometer,
  type LucideIcon,
} from 'lucide-react'
import { mediaAssets } from '../lib/media'
import { planConfig } from '../config/plan'

const iconMap: Record<string, LucideIcon> = {
  'bed-double': BedDouble,
  'sofa': Sofa,
  'utensils': UtensilsCrossed,
  'wind': Wind,
  'wifi': Wifi,
  'shower-head': ShowerHead,
  'washing-machine': WashingMachine,
  'car': Car,
  'package': Package,
  'thermometer': Thermometer,
}

export default function FacilityGallery() {
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

  const galleryImages = [
    { asset: mediaAssets.gallery.bedroom, label: 'ベッドルーム' },
    { asset: mediaAssets.gallery.terrace, label: 'テラス' },
    { asset: mediaAssets.gallery.kitchen, label: 'キッチン' },
    { asset: mediaAssets.gallery.bathroom, label: 'バスルーム' },
  ]

  return (
    <section id="facilities" ref={sectionRef} className="bg-[#F7F5F0] section-padding">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-10">
          <p className="fade-in-item section-subtitle mb-3">Facilities</p>
          <h2 className="fade-in-item section-title" style={{ transitionDelay: '0.1s' }}>
            客室と設備
          </h2>
        </div>

        {/* フォトグリッド */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 mb-12">
          {galleryImages.map(({ asset, label }, i) => (
            <div key={label} className="fade-in-item relative aspect-square overflow-hidden" style={{ transitionDelay: `${i * 0.08}s` }}>
              <Image
                src={asset.src}
                alt={asset.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors duration-300" aria-hidden />
              <span className="absolute bottom-2 left-3 text-white text-[11px] font-sans tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* 設備リスト */}
        <div className="fade-in-item bg-[#E8DDD0]/40 p-6 md:p-8">
          <p className="text-xs tracking-widest text-[#6B6460] uppercase mb-6 font-sans">設備一覧</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {planConfig.facilities.map((item) => {
              const Icon = iconMap[item.icon] ?? Package
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <Icon size={16} className="text-[#2D5A5A] mt-0.5 flex-shrink-0" aria-hidden />
                  <div>
                    <span className="text-[#2A2A2A] text-sm font-medium font-sans">{item.label}</span>
                    <span className="text-[#6B6460] text-xs ml-2 font-sans">— {item.detail}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 静かな瞬間の補助画像 */}
        <div className="fade-in-item mt-8 relative w-full aspect-[3/1] overflow-hidden">
          <Image
            src={mediaAssets.gallery.quiet.src}
            alt={mediaAssets.gallery.quiet.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover"
            loading="lazy"
            style={{ objectPosition: 'center 40%' }}
          />
          <div className="absolute inset-0 bg-black/25" aria-hidden />
          <p className="absolute inset-0 flex items-center justify-center text-white font-serif text-lg md:text-2xl tracking-widest">
            ただ、静かに。
          </p>
        </div>
      </div>
    </section>
  )
}
