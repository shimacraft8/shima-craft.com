import type { Metadata } from 'next'
import { siteConfig } from './config/site'
import './nagino-yado.css'

export const metadata: Metadata = {
  title: siteConfig.meta.title,
  description: siteConfig.meta.description,
  alternates: {
    canonical: 'https://shima-craft.com/nagino-yado-lp/',
  },
  openGraph: {
    title: siteConfig.meta.title,
    description: siteConfig.meta.description,
    images: [
      {
        url: siteConfig.meta.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — SHIMA CRAFT 制作サンプル`,
      },
    ],
    type: 'website',
    locale: 'ja_JP',
    url: 'https://shima-craft.com/nagino-yado-lp/',
    siteName: 'SHIMA CRAFT',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.meta.title,
    description: siteConfig.meta.description,
    images: [siteConfig.meta.ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'demo-site': 'true',
    'fictional-facility': 'true',
  },
}

export default function NaginoYadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="nagino-yado-root">
      {children}
    </div>
  )
}
