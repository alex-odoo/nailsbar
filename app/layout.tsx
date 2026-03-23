import type { Metadata, Viewport } from 'next'
import { DM_Sans, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nailsbar Odesa',
  description: 'Манікюр та педикюр в Одесі. Запис онлайн.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nailsbar',
  },
}

export const viewport: Viewport = {
  themeColor: '#1C2B4A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${dmSans.variable} ${cormorant.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full bg-cream text-navy antialiased">{children}</body>
    </html>
  )
}
