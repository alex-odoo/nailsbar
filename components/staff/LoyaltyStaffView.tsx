'use client'

import { useCallback, useState } from 'react'

type LoyaltyState = {
  clientId: string
  firstName: string
  cycleNumber: number
  cyclesRedeemed: number
  stamps: number
  target: number
  canRedeem: boolean
}

type StampResult = {
  state: LoyaltyState
  awarded: boolean
  reason: 'cycle_full' | 'duplicate' | null
}

const TOTAL = 10

export default function LoyaltyStaffView() {
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<LoyaltyState | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [creating, setCreating] = useState(false) // phone not found, asking for name
  const [firstName, setFirstName] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = useCallback(() => {
    setPhone('')
    setFirstName('')
    setState(null)
    setError('')
    setInfo('')
    setCreating(false)
  }, [])

  const search = useCallback(async () => {
    const phoneTrim = phone.trim()
    if (!phoneTrim) {
      setError('Введіть телефон')
      return
    }
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/loyalty/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneTrim }),
      })
      if (res.status === 404) {
        setCreating(true)
        setInfo('Клієнта немає в базі - введіть ім\'я для нової картки')
        return
      }
      if (!res.ok) {
        setError('Помилка пошуку')
        return
      }
      const s = (await res.json()) as LoyaltyState
      setState(s)
    } finally {
      setBusy(false)
    }
  }, [phone])

  const createCard = useCallback(async () => {
    const phoneTrim = phone.trim()
    const nameTrim = firstName.trim()
    if (!nameTrim) {
      setError("Введіть ім'я")
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/loyalty/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneTrim, firstName: nameTrim }),
      })
      if (!res.ok) {
        setError('Помилка створення')
        return
      }
      const s = (await res.json()) as LoyaltyState
      setState(s)
      setCreating(false)
      setInfo('Картку створено')
    } finally {
      setBusy(false)
    }
  }, [phone, firstName])

  const stamp = useCallback(async () => {
    if (!state) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/loyalty/staff/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: state.clientId }),
      })
      if (!res.ok) {
        setError('Помилка штампу')
        return
      }
      const data = (await res.json()) as StampResult
      setState(data.state)
      if (data.reason === 'cycle_full') {
        setInfo('Картка вже заповнена')
      } else if (data.awarded) {
        setInfo(`+1 штамп · ${data.state.stamps}/${TOTAL}`)
        setTimeout(() => setInfo(''), 2500)
      }
    } finally {
      setBusy(false)
    }
  }, [state])

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <h1 className="text-2xl font-display text-navy mb-4">Картки лояльності</h1>

      {!state && (
        <>
          <label className="block text-sm font-semibold text-navy mb-2">
            Телефон клієнта
          </label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="+380 XX XXX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !creating) search() }}
            disabled={creating}
            className="w-full px-4 py-3 bg-surface border border-cream-dark rounded-xl text-navy outline-none focus:border-navy text-base mb-3"
            style={{ fontSize: '16px' }}
          />

          {creating && (
            <>
              <label className="block text-sm font-semibold text-navy mb-2">
                Ім&apos;я клієнта
              </label>
              <input
                type="text"
                placeholder="Ім'я"
                value={firstName}
                autoFocus
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createCard() }}
                className="w-full px-4 py-3 bg-surface border border-cream-dark rounded-xl text-navy outline-none focus:border-navy text-base mb-3"
                style={{ fontSize: '16px' }}
              />
            </>
          )}

          {info && <p className="text-sm text-navy-muted mb-3">{info}</p>}
          {error && <p className="text-sm text-error mb-3">{error}</p>}

          <div className="flex gap-2">
            {!creating ? (
              <button
                onClick={search}
                disabled={busy}
                className="flex-1 bg-navy text-cream rounded-xl py-3 font-semibold disabled:opacity-50"
              >
                {busy ? '...' : 'Знайти'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setCreating(false); setFirstName(''); setInfo('') }}
                  disabled={busy}
                  className="px-4 bg-surface border border-cream-dark text-navy rounded-xl py-3 font-semibold"
                >
                  Скасувати
                </button>
                <button
                  onClick={createCard}
                  disabled={busy}
                  className="flex-1 bg-navy text-cream rounded-xl py-3 font-semibold disabled:opacity-50"
                >
                  {busy ? '...' : 'Створити картку'}
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-muted mt-4">
            Введіть номер клієнта. Якщо клієнта немає в базі, ми створимо нову картку.
          </p>
        </>
      )}

      {state && (
        <div>
          <div className="bg-surface border border-cream-dark rounded-2xl p-5 mb-4">
            <p className="text-xs uppercase tracking-wide text-muted mb-1">Клієнт</p>
            <p className="text-xl font-semibold text-navy mb-3">{state.firstName}</p>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-navy">{state.stamps}</span>
              <span className="text-lg text-muted">/ {TOTAL} штампів</span>
            </div>

            <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-navy rounded-full transition-all"
                style={{ width: `${Math.min((state.stamps / TOTAL) * 100, 100)}%` }}
              />
            </div>

            {state.cyclesRedeemed > 0 && (
              <p className="text-xs text-muted mt-3">
                Цикл №{state.cycleNumber} · нагород отримано: {state.cyclesRedeemed}
              </p>
            )}

            {state.canRedeem && (
              <p className="mt-3 text-sm font-semibold text-success">
                Картка заповнена - клієнту належить −50%
              </p>
            )}
          </div>

          {info && <p className="text-sm font-semibold text-navy mb-3">{info}</p>}
          {error && <p className="text-sm text-error mb-3">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={reset}
              disabled={busy}
              className="px-4 bg-surface border border-cream-dark text-navy rounded-xl py-3 font-semibold"
            >
              Інший
            </button>
            <button
              onClick={stamp}
              disabled={busy || state.canRedeem}
              className="flex-1 bg-navy text-cream rounded-xl py-4 font-bold text-base disabled:opacity-50"
            >
              {state.canRedeem ? 'Картка заповнена' : busy ? '...' : '+1 штамп'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
