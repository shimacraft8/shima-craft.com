import type { Metadata } from 'next'
import Link from 'next/link'
import { siteConfig } from '../config/site'

export const metadata: Metadata = {
  title: `予約デモページ｜${siteConfig.meta.title}`,
  description: 'これは制作サンプルのデモページです。実際の予約はできません。実案件では既存の予約システムへ接続します。',
  robots: {
    index: false,
    follow: false,
  },
}

export default function DemoBookingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
      {/* 制作サンプルバナー */}
      <div className="w-full max-w-lg mb-10 bg-[#2A2A2A] text-[#F7F5F0] rounded-sm px-6 py-4">
        <p className="text-xs tracking-widest uppercase font-sans mb-1 opacity-70">SHIMA CRAFT 制作サンプル</p>
        <p className="text-sm leading-relaxed">{siteConfig.demoNotice}</p>
      </div>

      {/* メインメッセージ */}
      <div className="w-full max-w-lg">
        <p className="text-xs tracking-[0.3em] uppercase text-[#6B6460] mb-4 font-sans">Demo Booking Page</p>
        <h1 className="text-2xl md:text-3xl font-serif text-[#2A2A2A] leading-tight mb-6" style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}>
          実際の予約はできません
        </h1>

        <div className="border border-[#E8DDD0] rounded-sm p-6 mb-8 text-left space-y-4 bg-white/50">
          <div className="flex items-start gap-3">
            <span className="text-[#2D5A5A] mt-0.5 flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <div>
              <p className="text-sm text-[#2A2A2A] font-medium mb-1">これは制作サンプルのデモページです</p>
              <p className="text-sm text-[#6B6460] leading-relaxed">
                このページは「凪ノ宿 AMAMI」LPの予約導線デモです。架空の施設を想定しており、実際の予約処理は行われません。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[#2D5A5A] mt-0.5 flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <div>
              <p className="text-sm text-[#2A2A2A] font-medium mb-1">実案件では既存の予約システムへ接続します</p>
              <p className="text-sm text-[#6B6460] leading-relaxed">
                宿泊施設様がご利用中の予約システム（じゃらん・楽天トラベル・自社予約サイト等）のURLへそのまま接続できます。システム移行は不要です。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[#2D5A5A] mt-0.5 flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <div>
              <p className="text-sm text-[#2A2A2A] font-medium mb-1">制作・導入のご相談はこちら</p>
              <p className="text-sm text-[#6B6460] leading-relaxed">
                このLPを実際の宿泊施設向けに制作する場合は、SHIMA CRAFTまでお気軽にご相談ください。
              </p>
            </div>
          </div>
        </div>

        {/* CTAボタン群 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/nagino-yado-lp/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2D5A5A] text-[#F7F5F0] text-sm tracking-widest hover:bg-[#1E3F3F] transition-colors"
          >
            ← LPへ戻る
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#2D5A5A] text-[#2D5A5A] text-sm tracking-widest hover:bg-[#2D5A5A] hover:text-[#F7F5F0] transition-colors"
          >
            制作を相談する
          </Link>
        </div>
      </div>

      {/* フッター */}
      <footer className="mt-16 text-center">
        <Link
          href="/"
          className="text-xs tracking-widest text-[#6B6460] hover:text-[#2D5A5A] transition-colors"
        >
          SHIMA CRAFT — Web制作・デジタルマーケティング
        </Link>
      </footer>
    </div>
  )
}
