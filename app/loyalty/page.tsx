'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'

const TOTAL = 9
const PIN_LENGTH = 6
const STORAGE_KEY = 'nailsbar.loyalty.clientId'

type LoyaltyState = {
  clientId: string
  firstName: string
  cycleNumber: number
  cyclesRedeemed: number
  stamps: number
  target: number
  canRedeem: boolean
}

type Screen = 'welcome' | 'card' | 'loading'

export default function LoyaltyPage() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [form, setForm] = useState({ firstName: '', phone: '' })
  const [needName, setNeedName] = useState(false) // phone not found, ask name
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [state, setState] = useState<LoyaltyState | null>(null)

  const [pinOpen, setPinOpen] = useState(false)
  const [pinMode, setPinMode] = useState<'stamp' | 'redeem'>('stamp')
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [popping, setPopping] = useState<number | null>(null)
  const [celeb, setCeleb] = useState(false)
  const [origin, setOrigin] = useState('')

  // On mount: ?c=clientId in URL takes precedence over localStorage
  useEffect(() => {
    setOrigin(window.location.origin)
    const url = new URL(window.location.href)
    const fromQuery = url.searchParams.get('c')
    const fromStorage = !fromQuery ? localStorage.getItem(STORAGE_KEY) : null
    const clientId = fromQuery || fromStorage

    if (!clientId) {
      setScreen('welcome')
      return
    }

    fetch('/api/loyalty/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
      .then(async (r) => (r.ok ? ((await r.json()) as LoyaltyState) : null))
      .then((s) => {
        if (s) {
          setState(s)
          localStorage.setItem(STORAGE_KEY, s.clientId)
          setScreen('card')
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setScreen('welcome')
        }
      })
      .catch(() => setScreen('welcome'))
  }, [])

  const openCard = useCallback(async () => {
    const phone = form.phone.trim()
    const firstName = form.firstName.trim()
    if (!phone) {
      setFormError('Введіть номер телефону')
      setTimeout(() => setFormError(null), 1800)
      return
    }
    if (needName && !firstName) {
      setFormError("Введіть ім'я для нової картки")
      setTimeout(() => setFormError(null), 1800)
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const body = needName ? { firstName, phone } : { phone }
      const res = await fetch('/api/loyalty/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 404) {
        const data = await res.json().catch(() => ({}))
        if (data?.error === 'not_found') {
          // Phone not in DB: ask for a name and resubmit as create.
          setNeedName(true)
          setFormError("Картку не знайдено - введіть ім'я для нової")
          setTimeout(() => setFormError(null), 2400)
          return
        }
      }
      if (!res.ok) {
        setFormError('Помилка, спробуйте ще раз')
        setTimeout(() => setFormError(null), 1800)
        return
      }
      const s = (await res.json()) as LoyaltyState
      setState(s)
      localStorage.setItem(STORAGE_KEY, s.clientId)
      setScreen('card')
    } finally {
      setSubmitting(false)
    }
  }, [form.firstName, form.phone, needName])

  const goBack = useCallback(() => {
    setState(null)
    setForm({ firstName: '', phone: '' })
    setNeedName(false)
    setFormError(null)
    localStorage.removeItem(STORAGE_KEY)
    setScreen('welcome')
    // Drop ?c=... from URL so reload doesn't auto-load the old client
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('c')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const openPin = useCallback((mode: 'stamp' | 'redeem') => {
    if (!state) return
    if (mode === 'stamp' && state.stamps >= TOTAL) return
    if (mode === 'redeem' && !state.canRedeem) return
    setPinMode(mode)
    setPin('')
    setPinErr('')
    setPinOpen(true)
  }, [state])

  const closePin = useCallback(() => {
    setPin('')
    setPinErr('')
    setPinOpen(false)
  }, [])

  const submitPin = useCallback(async (entered: string) => {
    if (!state) return
    setPinErr('')
    const endpoint = pinMode === 'stamp' ? '/api/loyalty/stamp' : '/api/loyalty/redeem'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: state.clientId, pin: entered }),
    })

    if (res.status === 401) {
      setPinErr('Невірний пін-код')
      setPin('')
      setTimeout(() => setPinErr(''), 2200)
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setPinErr(typeof data?.error === 'string' ? data.error : 'Помилка')
      setPin('')
      setTimeout(() => setPinErr(''), 2200)
      return
    }

    const data = await res.json()
    const fresh = (data?.state ?? data) as LoyaltyState
    closePin()

    if (pinMode === 'stamp') {
      const newIndex = fresh.stamps
      setState(fresh)
      // pop animation on the freshly-filled slot
      if (newIndex >= 1 && newIndex <= TOTAL) {
        setPopping(newIndex)
        setTimeout(() => setPopping(null), 450)
      }
      if (fresh.canRedeem) {
        setTimeout(() => setCeleb(true), 700)
      }
    } else {
      setState(fresh)
      setCeleb(false)
    }
  }, [state, pinMode, closePin])

  const pressKey = useCallback((k: string) => {
    if (k === 'del') {
      setPin((p) => p.slice(0, -1))
      return
    }
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev
      const next = prev + k
      if (next.length === PIN_LENGTH) {
        setTimeout(() => submitPin(next), 130)
      }
      return next
    })
  }, [submitPin])

  return (
    <>
      {/* WELCOME */}
      <div className={`screen ${screen === 'welcome' ? 'active' : ''}`}>
        <Image
          src="/loyalty-logo.jpg"
          alt="Nailsbar Odesa"
          width={768}
          height={215}
          priority
          className="welcome-logo"
        />
        <div className="welcome-box">
          <h2>Картка лояльності</h2>
          <p>
            {needName
              ? <>Перша картка? Додайте ім&apos;я і ми створимо її. Збирайте 9 процедур - наступна з <strong>−50%</strong></>
              : <>Введіть номер телефону щоб відкрити вашу картку. Збирайте 9 процедур - наступна з <strong>−50%</strong></>}
          </p>
          <input
            className={`input ${formError ? 'error' : ''}`}
            type="tel"
            inputMode="tel"
            placeholder="+380 XX XXX XX XX"
            maxLength={20}
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') openCard() }}
          />
          {needName && (
            <input
              className={`input ${formError ? 'error' : ''}`}
              type="text"
              placeholder="Ваше ім'я"
              maxLength={30}
              autoComplete="given-name"
              autoFocus
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') openCard() }}
            />
          )}
          {formError && (
            <div style={{ color: '#ff8fab', fontSize: '0.78rem', marginBottom: 10, textAlign: 'center' }}>
              {formError}
            </div>
          )}
          <button className="btn-main" onClick={openCard} disabled={submitting}>
            {submitting
              ? 'Завантаження...'
              : needName
                ? 'Створити картку →'
                : 'Відкрити картку →'}
          </button>
        </div>
      </div>

      {/* LOADING */}
      <div className={`screen ${screen === 'loading' ? 'active' : ''}`}>
        <Image
          src="/loyalty-logo.jpg"
          alt="Nailsbar Odesa"
          width={768}
          height={215}
          priority
          className="welcome-logo"
        />
        <div className="brand-sub">Завантаження...</div>
      </div>

      {/* CARD */}
      {state && (
        <div className={`screen ${screen === 'card' ? 'active' : ''}`}>
          <div className="greeting">{state.firstName}</div>
          <div className="hint">Покажіть картку майстру</div>

          <div className="loyalty-card">
            <div className="card-title">Loyalty Card</div>
            <div className="card-sub">Знижка −50% на 10-ту процедуру</div>
            {state.cyclesRedeemed > 0 && (
              <div className="cycle-badge">Цикл №{state.cycleNumber} · нагород: {state.cyclesRedeemed}</div>
            )}
            <div className="grid">
              {Array.from({ length: 10 }).map((_, i) => {
                const isLogo = i === 0
                const isReward = i === 9
                const stamped = !isLogo && !isReward && i <= state.stamps
                const rewardOn = isReward && state.canRedeem
                const isPopping = popping !== null && i === popping
                const classes = [
                  'hslot',
                  isLogo || stamped || rewardOn ? 'on' : '',
                  isReward ? 'reward-slot' : '',
                  isPopping ? 'popping' : '',
                ].filter(Boolean).join(' ')
                return (
                  <div key={i} className={classes}>
                    <svg viewBox="0 0 100 92">
                      <path
                        className="hfill"
                        d="M50 85C50 85 5 52 5 28C5 14 16 5 28 5C37 5 45 11 50 18C55 11 63 5 72 5C84 5 95 14 95 28C95 52 50 85 50 85Z"
                      />
                    </svg>
                    {isLogo && (
                      <div className="logo-inside">
                        <span>NAILS</span>
                        <span>BAR</span>
                      </div>
                    )}
                    {isReward && <div className="reward-lbl">−50%</div>}
                    {!isLogo && !isReward && <div className="stamp-ico">💅</div>}
                  </div>
                )
              })}
            </div>
            <div className="prog-bar">
              <div className="prog-fill" style={{ width: `${Math.min((state.stamps / TOTAL) * 100, 100)}%` }} />
            </div>
            <div className="prog-txt">{state.stamps} / {TOTAL} процедур</div>
            <div className="card-foot">inst: @nailsbar.odesa</div>
          </div>

          {state.canRedeem ? (
            <button className="btn-redeem" onClick={() => openPin('redeem')}>
              🎉 Використати −50% (потрібен пін)
            </button>
          ) : (
            <button className="btn-stamp" onClick={() => openPin('stamp')}>
              💅 Поставити штамп (тільки майстер)
            </button>
          )}

          {origin && (
            <div className="qr-card">
              <div className="qr-box">
                <QRCodeSVG value={`${origin}/loyalty?c=${state.clientId}`} size={84} level="M" />
              </div>
              <div className="qr-text">
                <b>Ваш QR</b>
                Збережіть скрін на телефон щоб показати майстру наступного візиту.
              </div>
            </div>
          )}

          <button className="btn-back" onClick={goBack}>← Інший клієнт</button>
        </div>
      )}

      {/* PIN OVERLAY */}
      <div className={`overlay ${pinOpen ? 'show' : ''}`}>
        <div className="pin-sheet">
          <div className="pin-handle" />
          <div className="pin-title">Майстер</div>
          <div className="pin-sub">Введіть пін-код</div>
          <div className="pin-dots">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div key={i} className={`pdot ${i < pin.length ? 'on' : ''}`} />
            ))}
          </div>
          <div className="keypad">
            {['1','2','3','4','5','6','7','8','9'].map((k) => (
              <button key={k} className="key" onClick={() => pressKey(k)}>{k}</button>
            ))}
            <button className="key sm" onClick={() => pressKey('del')}>⌫</button>
            <button className="key" onClick={() => pressKey('0')}>0</button>
            <button className="key sm" onClick={closePin}>✕</button>
          </div>
          <div className="pin-err">{pinErr}</div>
          <button className="btn-cancel" onClick={closePin}>Скасувати</button>
        </div>
      </div>

      {/* CELEBRATION */}
      <div className={`celeb ${celeb ? 'show' : ''}`}>
        <div className="celeb-ico">🎉💅✨</div>
        <div className="celeb-h">Вітаємо!</div>
        <div className="celeb-p">
          Ви зібрали 9 процедур<br />
          і отримуєте <strong style={{ color: 'var(--pink-hot)', fontSize: '1.15em' }}>−50%</strong><br />
          на наступний візит!
        </div>
        <button className="btn-celeb" onClick={() => setCeleb(false)}>
          Закрити
        </button>
      </div>
    </>
  )
}
