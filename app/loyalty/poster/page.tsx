'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// Standalone page for printing a salon-wide QR. Open at /loyalty/poster
// and print to A5/A4 from the browser. The QR points to the public
// loyalty page where clients enter their name + phone.
export default function PosterPage() {
  const [url, setUrl] = useState('')
  useEffect(() => {
    setUrl(`${window.location.origin}/loyalty`)
  }, [])

  return (
    <div className="poster-page">
      <div className="poster-title">Nailsbar</div>
      <div className="poster-sub">Картка лояльності</div>
      <div className="poster-qr">
        {url && <QRCodeSVG value={url} size={320} level="H" />}
      </div>
      <div className="poster-cta">Скануй та збирай −50%</div>
      <div className="poster-url">{url || ' '}</div>
    </div>
  )
}
