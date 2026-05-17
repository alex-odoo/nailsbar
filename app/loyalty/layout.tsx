import type { Metadata, Viewport } from 'next'
import { Great_Vibes, Nunito } from 'next/font/google'
import type { ReactNode } from 'react'
import './loyalty.css'

const greatVibes = Great_Vibes({
  variable: '--font-great-vibes',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

const nunito = Nunito({
  variable: '--font-nunito',
  weight: ['400', '600', '700', '900'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nailsbar · Картка лояльності',
  description: 'Збирай штампи в Nailsbar Odesa та отримай знижку 50% на 10-ту процедуру.',
}

export const viewport: Viewport = {
  themeColor: '#3d0510',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function LoyaltyLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${greatVibes.variable} ${nunito.variable} loyalty-root`}>
      {children}
    </div>
  )
}
