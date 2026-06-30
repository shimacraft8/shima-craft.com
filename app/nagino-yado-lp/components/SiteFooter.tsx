import Link from 'next/link'
import { siteConfig } from '../config/site'

export default function SiteFooter() {
  return (
    <footer className="bg-[#2A2A2A] text-[#E8DDD0]/60 font-sans">
      {/* メインフッター */}
      <div className="max-w-3xl mx-auto px-6 py-12 md:px-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* 施設情報 */}
          <div>
            <p className="text-[#F7F5F0] font-serif text-base mb-1">{siteConfig.name}</p>
            <p className="text-[#E8DDD0]/40 text-[11px] tracking-widest uppercase mb-5">
              {siteConfig.nameEn}
            </p>
            <div className="space-y-1.5 text-[12px]">
              <p>{siteConfig.location}</p>
              <p>チェックイン {siteConfig.checkIn} / チェックアウト {siteConfig.checkOut}</p>
              <p>定員：{siteConfig.capacity}</p>
              <p>{siteConfig.parking}</p>
              <p>{siteConfig.wifi}</p>
            </div>
          </div>

          {/* ナビ */}
          <div>
            <p className="text-[#E8DDD0]/40 text-[11px] tracking-widest uppercase mb-4">Navigation</p>
            <nav aria-label="フッターナビゲーション">
              <ul className="space-y-2 text-[12px]">
                {[
                  { href: '#plan', label: 'プラン概要' },
                  { href: '#facilities', label: '客室と設備' },
                  { href: '#timeline', label: '2泊3日の過ごし方' },
                  { href: '#benefits', label: '公式予約特典' },
                  { href: '#pricing', label: '料金' },
                  { href: '#faq', label: 'よくある質問' },
                  { href: '#access', label: 'アクセス' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <a href={href} className="hover:text-[#E8DDD0] transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* デモ表記 */}
      <div className="border-t border-white/5 px-6 py-8 md:px-10">
        <div className="max-w-3xl mx-auto space-y-2 text-[11px] text-[#E8DDD0]/40">
          <p>本サイトは <strong className="text-[#E8DDD0]/60">{siteConfig.creator.name}</strong> の制作事例デモです。</p>
          <p>凪ノ宿 AMAMI は架空の宿泊施設です。実在する施設ではありません。</p>
          <p>掲載している画像・映像・料金・口コミ・施設情報はすべてデモ用のフィクションです。</p>
          <p>本サイトへの予約・問い合わせには対応できません。</p>
        </div>

        {/* SHIMA CRAFT導線 */}
        <div className="max-w-3xl mx-auto mt-5 pt-5 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-[11px] text-[#E8DDD0]/30">
            制作：{siteConfig.creator.name} — {siteConfig.creator.description}
          </p>
          <Link
            href={siteConfig.creator.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#2D5A5A]-light hover:text-[#2D5A5A] transition-colors underline underline-offset-4"
          >
            {siteConfig.creator.name} 公式サイト →
          </Link>
        </div>
      </div>
    </footer>
  )
}
