'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { siteConfig } from '../config/site'

export default function DemoNotice() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      role="banner"
      aria-label="デモサイトのお知らせ"
      className="relative z-50 bg-[#2A2A2A] text-[#F7F5F0] text-xs py-2 px-4 text-center"
    >
      <p className="max-w-2xl mx-auto pr-8 leading-relaxed">
        {siteConfig.demoNotice}
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="このお知らせを閉じる"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}
