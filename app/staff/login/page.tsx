'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const KEYPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
]

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'pin'>('phone')
  const [phone, setPhone] = useState('')
  const [staffName, setStaffName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const phoneRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (step === 'phone') phoneRef.current?.focus()
  }, [step])

  function formatPhone(value: string) {
    // Strip non-digits
    const digits = value.replace(/\D/g, '')
    return digits
  }

  async function submitPhone() {
    const normalized = phone.trim().replace(/\s/g, '')
    if (!normalized) {
      setError('Введіть номер телефону')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      })
      if (res.ok) {
        const data = await res.json()
        setStaffName(data.name)
        setStep('pin')
      } else {
        setError('Номер не знайдено')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleKey(key: string) {
    if (loading) return
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1))
      setError('')
      return
    }
    if (!key) return
    const next = (pin + key).slice(0, 6)
    setPin(next)
    setError('')
    if (next.length === 6) submitPin(next)
  }

  async function submitPin(code: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim().replace(/\s/g, ''), pin: code }),
      })
      if (res.ok) {
        router.push('/staff/dashboard')
      } else {
        setError('Невірний PIN-код')
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

      {step === 'phone' ? (
        /* ── Phone step ── */
        <div className="w-full max-w-xs px-10 flex flex-col items-center gap-4">
          <p className="text-sm text-muted text-center">Введіть номер телефону</p>

          <input
            ref={phoneRef}
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && submitPhone()}
            placeholder="+380XXXXXXXXX"
            className="w-full text-center text-lg bg-surface border border-cream-dark rounded-2xl px-4 py-4 text-navy placeholder:text-muted/50 outline-none focus:border-navy/40 transition-all"
          />

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            onClick={submitPhone}
            disabled={loading || !phone.trim()}
            className="w-full h-14 rounded-2xl bg-navy text-cream text-base font-medium active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? 'Перевірка...' : 'Далі →'}
          </button>
        </div>
      ) : (
        /* ── PIN step ── */
        <div className="w-full max-w-xs px-10 flex flex-col items-center">
          {/* Staff name + back */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => { setStep('phone'); setPin(''); setError('') }}
              className="text-muted text-lg active:opacity-50"
            >
              ←
            </button>
            <p className="text-sm text-navy font-medium">{staffName}</p>
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

          <p className="text-sm mb-8 h-5">
            {loading
              ? <span className="text-muted">Перевірка...</span>
              : error
              ? <span className="text-error">{error}</span>
              : <span className="text-muted">Введіть PIN-код</span>
            }
          </p>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full">
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
        </div>
      )}

      <p className="absolute bottom-8 text-xs text-muted">
        nailsbar.store · staff
      </p>
    </div>
  )
}
