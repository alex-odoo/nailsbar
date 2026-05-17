'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'

// Standalone page for printing a salon-wide QR. Open at /loyalty/poster
// and print to A5/A4 from the browser.
// Variants (selected via `?to=` query):
//   default  -> QR to /loyalty (the loyalty card)
//   instagram-> QR to the Nailsbar Instagram profile
const INSTAGRAM_URL = 'https://www.instagram.com/nailsbar.odesa/'

type Variant = {
  url: string
  sub: string
  cta: string
  label: string
}

export default function PosterPage() {
  const [variant, setVariant] = useState<Variant | null>(null)

  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('to')
    if (target === 'instagram') {
      setVariant({
        url: INSTAGRAM_URL,
        sub: 'Instagram',
        cta: 'Слідкуй за нами',
        label: '@nailsbar.odesa',
      })
    } else {
      setVariant({
        url: `${window.location.origin}/loyalty`,
        sub: 'Картка лояльності',
        cta: 'Скануй та збирай −50%',
        label: `${window.location.host}/loyalty`,
      })
    }
  }, [])

  return (
    <div className="poster-page">
      <Image
        src="/loyalty-logo.jpg"
        alt="Nailsbar Odesa"
        width={768}
        height={215}
        priority
        className="poster-logo"
      />
      <div className="poster-sub">{variant?.sub ?? ' '}</div>
      <div className="poster-qr">
        {variant && <QRCodeSVG value={variant.url} size={320} level="H" />}
      </div>
      <div className="poster-cta">{variant?.cta ?? ' '}</div>
      <div className="poster-url">{variant?.label ?? ' '}</div>
    </div>
  )
}
