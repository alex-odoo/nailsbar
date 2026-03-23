'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
]

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleKey(key: string) {
    if (loading) return
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1))
      setError(false)
      return
    }
    if (!key) return
    const next = (pin + key).slice(0, 6)
    setPin(next)
    setError(false)
    if (next.length === 6) submit(next)
  }

  async function submit(code: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      })
      if (res.ok) {
        router.push('/staff/dashboard')
      } else {
        setError(true)
        setPin('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center select-none">

      {/* Logo */}
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.25em] text-muted uppercase mb-2">Nailsbar</p>
        <h1 className="text-4xl font-display text-navy">Odesa</h1>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150
              ${i < pin.length
                ? error ? 'bg-error border-error' : 'bg-navy border-navy'
                : 'bg-transparent border-navy/30'
              }
            `}
          />
        ))}
      </div>

      <p className="text-sm mb-8 h-5 transition-all">
        {loading
          ? <span className="text-muted">Перевірка...</span>
          : error
          ? <span className="text-error">Невірний PIN-код</span>
          : <span className="text-muted"> </span>
        }
      </p>

      {/* Custom keypad */}
      <div className="grid grid-cols-3 gap-3 px-10 w-full max-w-xs">
        {KEYPAD.flat().map((key, i) => {
          if (!key) return <div key={i} />
          const isDelete = key === '⌫'
          return (
            <button
              key={i}
              onClick={() => handleKey(key)}
              disabled={loading}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className={`h-16 rounded-2xl text-2xl font-medium active:scale-95 active:opacity-60 transition-all
                ${isDelete
                  ? 'text-muted bg-transparent'
                  : 'bg-surface text-navy shadow-sm border border-cream-dark'
                }
                ${loading ? 'opacity-40' : ''}
              `}
            >
              {key}
            </button>
          )
        })}
      </div>

      <p className="absolute bottom-8 text-xs text-muted">
        nailsbar.store · staff
      </p>
    </div>
  )
}
