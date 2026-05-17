'use client'

import { useCallback, useState } from 'react'

type StampRecord = {
  id: string
  createdAt: string
  source: string
  staffName: string | null
  cycleNumber: number
}

type LoyaltyState = {
  clientId: string
  firstName: string
  cycleNumber: number
  cyclesRedeemed: number
  stamps: number
  target: number
  canRedeem: boolean
  todayStamps?: number
  recentStamps?: StampRecord[]
}

type StampResult = {
  state: LoyaltyState
  awarded: boolean
  reason: 'cycle_full' | 'duplicate' | null
}

const TOTAL = 10

function formatStampDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const stampDay = new Date(d)
  stampDay.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((today.getTime() - stampDay.getTime()) / 86400000)
  const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  if (dayDiff === 0) return `Сьогодні, ${time}`
  if (dayDiff === 1) return `Вчора, ${time}`
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) + `, ${time}`
}

export default function LoyaltyStaffView({ isAdmin }: { isAdmin: boolean }) {
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<LoyaltyState | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [creating, setCreating] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPast, setShowPast] = useState(false)

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
        body: JSON.stringify({ phone: phoneTrim, history: true }),
      })
      if (res.status === 404) {
        setCreating(true)
        setInfo("Клієнта немає в базі - введіть ім'я для нової картки")
        return
      }
      if (!res.ok) {
        setError('Помилка пошуку')
        return
      }
      setState((await res.json()) as LoyaltyState)
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
        body: JSON.stringify({ phone: phoneTrim, firstName: nameTrim, history: true }),
      })
      if (!res.ok) {
        setError('Помилка створення')
        return
      }
      setState((await res.json()) as LoyaltyState)
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

  const deleteStamp = useCallback(async (stampId: string) => {
    if (!state) return
    if (!window.confirm('Видалити цей штамп?')) return
    setBusy(true); setError(''); setInfo('')
    try {
      const res = await fetch(`/api/loyalty/staff/stamp/${stampId}`, { method: 'DELETE' })
      if (res.status === 403) { setError('Тільки адмін може видалити штамп'); return }
      if (!res.ok) { setError('Не вдалося видалити'); return }
      const data = (await res.json()) as { state: LoyaltyState; removed: number }
      setState(data.state)
      setInfo('Штамп видалено')
      setTimeout(() => setInfo(''), 2500)
    } finally { setBusy(false) }
  }, [state])

  const clearCycle = useCallback(async () => {
    if (!state) return
    const ok = window.confirm(
      `Очистити всі штампи поточного циклу для ${state.firstName}? Дія незворотна.`,
    )
    if (!ok) return
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const res = await fetch('/api/loyalty/staff/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: state.clientId }),
      })
      if (res.status === 403) {
        setError('Тільки адмін може очистити картку')
        return
      }
      if (!res.ok) {
        setError('Не вдалося очистити')
        return
      }
      const data = (await res.json()) as { state: LoyaltyState; removed: number }
      setState(data.state)
      setInfo(`Очищено ${data.removed} штамп(ів)`)
      setTimeout(() => setInfo(''), 3000)
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
              {state.todayStamps !== undefined && state.todayStamps > 0 && (
                <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full bg-success/15 text-success">
                  Сьогодні: +{state.todayStamps}
                </span>
              )}
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

          {state.recentStamps && state.recentStamps.length > 0 && (() => {
            const current = state.recentStamps!.filter(s => s.cycleNumber === state.cycleNumber)
            const past = state.recentStamps!.filter(s => s.cycleNumber < state.cycleNumber)
            return (
              <div className="mb-4">
                {current.length > 0 && (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted mb-2">
                      Штампи поточного циклу
                    </p>
                    <div className="space-y-1.5 mb-3">
                      {current.map((s) => (
                        <div
                          key={s.id}
                          className="bg-surface border border-cream-dark rounded-lg px-3 py-2 flex justify-between items-center text-sm"
                        >
                          <span className="text-navy">💅 {formatStampDate(s.createdAt)}</span>
                          <span className="flex items-center gap-2 text-xs text-muted">
                            <span>
                              {s.staffName ?? '—'}
                              {s.source === 'auto_appointment' && ' · авто'}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => deleteStamp(s.id)}
                                disabled={busy}
                                aria-label="Видалити штамп"
                                className="w-6 h-6 flex items-center justify-center rounded-full text-error border border-error/25 hover:bg-error/5 disabled:opacity-40"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {past.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowPast(v => !v)}
                      className="text-xs uppercase tracking-wide text-muted hover:text-navy flex items-center gap-1"
                    >
                      <span>{showPast ? '▾' : '▸'}</span>
                      Минулі цикли · {past.length} штамп(ів)
                    </button>
                    {showPast && (
                      <div className="space-y-1 mt-2">
                        {past.map((s) => (
                          <div
                            key={s.id}
                            className="px-3 py-1.5 flex justify-between items-center text-xs text-muted"
                          >
                            <span>💅 {formatStampDate(s.createdAt)} · цикл №{s.cycleNumber}</span>
                            <span>
                              {s.staffName ?? '—'}
                              {s.source === 'auto_appointment' && ' · авто'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

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

          {isAdmin && state.stamps > 0 && (
            <button
              onClick={clearCycle}
              disabled={busy}
              className="mt-3 w-full text-sm text-error border border-error/30 rounded-xl py-2.5 font-medium hover:bg-error/5 disabled:opacity-50"
            >
              Очистити поточний цикл (admin)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
