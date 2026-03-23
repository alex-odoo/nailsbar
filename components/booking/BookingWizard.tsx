'use client'

import { useState } from 'react'

type Service = {
  id: string
  name: string
  category: string
  duration: number
  price: number
  description: string | null
}

type StaffMember = {
  id: string
  name: string
  avatar: string | null
}

type Props = {
  services: Service[]
  staff: StaffMember[]
}

type Step = 'service' | 'datetime' | 'contact' | 'confirm' | 'done'

const CATEGORY_LABELS: Record<string, string> = {
  complex:    'Комплекси',
  manicure:   'Манікюр',
  pedicure:   'Педикюр',
  nail_art:   'Дизайн',
  extra:      'Додатково',
  correction: 'Корекція',
}

export default function BookingWizard({ services, staff }: Props) {
  const defaultStaffId = staff[0]?.id ?? ''
  const [step, setStep] = useState<Step>('service')
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selected, setSelected] = useState<{
    staffId?: string
    date?: string
    time?: string
    firstName?: string
    lastName?: string
    phone?: string
  }>({})

  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [appointmentId, setAppointmentId] = useState<string | null>(null)

  const totalDuration = selectedServices.reduce((s, sv) => s + sv.duration, 0)
  const totalPrice = selectedServices.reduce((s, sv) => s + sv.price, 0)

  function toggleService(s: Service) {
    setSelectedServices((prev) => {
      const exists = prev.find((x) => x.id === s.id)
      if (exists) return prev.filter((x) => x.id !== s.id)
      return [...prev, s]
    })
  }

  async function fetchSlots(date: string) {
    if (selectedServices.length === 0) return
    setLoading(true)
    const r = await fetch(
      `/api/slots/available?date=${date}&duration=${totalDuration}&staffId=${selected.staffId ?? defaultStaffId}`
    )
    const data = await r.json()
    setSlots(data.slots ?? [])
    setLoading(false)
  }

  async function handleSubmit() {
    setLoading(true)
    const r = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedServices[0].id,
        extraServiceIds: selectedServices.slice(1).map((s) => s.id),
        staffId: selected.staffId ?? defaultStaffId,
        date: selected.date,
        startTime: selected.time,
        clientFirstName: selected.firstName,
        clientLastName: selected.lastName || null,
        clientPhone: selected.phone,
        totalDuration,
        totalPrice,
      }),
    })
    const data = await r.json()
    setLoading(false)
    setAppointmentId(data.id ?? null)
    setStep('done')
  }

  // ── Step: Service ──────────────────────────────────────
  if (step === 'service') {
    const categories = [...new Set(services.map((s) => s.category))]

    return (
      <div className="px-4 py-6">
        <h2 className="text-lg font-semibold text-navy mb-1">Оберіть послуги</h2>
        <p className="text-xs text-muted mb-4">Можна обрати кілька</p>

        {categories.map((cat) => (
          <div key={cat} className="mb-5">
            <p className="text-xs tracking-widest text-muted uppercase mb-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>
            <div className="space-y-2">
              {services.filter((s) => s.category === cat).map((s) => {
                const isSelected = !!selectedServices.find((x) => x.id === s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s)}
                    className={`w-full flex justify-between items-center rounded-xl px-4 py-3.5 border text-left transition-colors ${
                      isSelected
                        ? 'bg-navy text-surface border-navy'
                        : 'bg-surface border-cream-dark text-navy hover:border-navy'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-surface' : 'border-cream-dark'
                      }`}>
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-surface" />}
                      </span>
                      <div>
                        <p className={`font-medium ${isSelected ? 'text-surface' : 'text-navy'}`}>{s.name}</p>
                        {s.description && (
                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-surface/70' : 'text-muted'}`}>{s.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className={`font-semibold ${isSelected ? 'text-surface' : 'text-navy'}`}>{s.price} ₴</p>
                      <p className={`text-xs ${isSelected ? 'text-surface/70' : 'text-muted'}`}>{s.duration} хв</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Sticky footer */}
        {selectedServices.length > 0 && (
          <div className="sticky bottom-4 mt-4">
            <button
              onClick={() => setStep('datetime')}
              className="w-full bg-navy text-surface rounded-xl py-4 font-semibold text-base flex justify-between items-center px-5"
            >
              <span>Далі →</span>
              <span className="text-surface/70 text-sm">{totalDuration} хв · {totalPrice} ₴</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Step: Date & Time ──────────────────────────────────
  if (step === 'datetime') {
    const today = new Date()
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return d.toISOString().split('T')[0]
    })

    return (
      <div className="px-4 py-6">
        <button onClick={() => setStep('service')} className="text-sm text-muted mb-4">
          ← {selectedServices.map((s) => s.name).join(', ')}
        </button>
        <h2 className="text-lg font-semibold text-navy mb-4">Оберіть дату</h2>

        {/* Date scroll */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide mb-6">
          {dates.map((d) => {
            const date = new Date(d)
            const isSelected = selected.date === d
            return (
              <button
                key={d}
                onClick={() => {
                  setSelected((p) => ({ ...p, date: d, time: undefined }))
                  fetchSlots(d)
                }}
                className={`shrink-0 flex flex-col items-center w-14 py-2.5 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-navy text-surface border-navy'
                    : 'bg-surface border-cream-dark text-navy'
                }`}
              >
                <span className="text-xs">{date.toLocaleDateString('uk-UA', { weekday: 'short' })}</span>
                <span className="text-xl font-bold leading-tight">{date.getDate()}</span>
                <span className="text-xs">{date.toLocaleDateString('uk-UA', { month: 'short' })}</span>
              </button>
            )
          })}
        </div>

        {/* Time slots */}
        {selected.date && (
          <>
            <h2 className="text-lg font-semibold text-navy mb-3">Оберіть час</h2>
            {loading ? (
              <p className="text-muted text-sm">Завантаження...</p>
            ) : slots.length === 0 ? (
              <p className="text-muted text-sm">Немає вільних слотів на цей день</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 mb-6">
                {slots.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelected((p) => ({ ...p, time: t }))}
                    className={`py-2.5 rounded-lg border text-sm font-mono transition-colors ${
                      selected.time === t
                        ? 'bg-navy text-surface border-navy'
                        : 'bg-surface border-cream-dark text-navy'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selected.date && selected.time && (
          <button
            onClick={() => setStep('contact')}
            className="w-full bg-navy text-surface rounded-xl py-4 font-semibold text-base"
          >
            Далі →
          </button>
        )}
      </div>
    )
  }

  // ── Step: Contact ──────────────────────────────────────
  if (step === 'contact') {
    return (
      <div className="px-4 py-6">
        <button onClick={() => setStep('datetime')} className="text-sm text-muted mb-4">
          ← Назад
        </button>
        <h2 className="text-lg font-semibold text-navy mb-4">Ваші контакти</h2>

        <div className="space-y-3 mb-6">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Ім'я *</label>
            <input
              type="text"
              placeholder="Ім'я"
              value={selected.firstName ?? ''}
              onChange={(e) => setSelected((p) => ({ ...p, firstName: e.target.value }))}
              className="w-full mt-1 px-4 py-3 border border-cream-dark rounded-xl bg-surface text-navy outline-none focus:border-navy transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Прізвище</label>
            <input
              type="text"
              placeholder="Прізвище (необов'язково)"
              value={selected.lastName ?? ''}
              onChange={(e) => setSelected((p) => ({ ...p, lastName: e.target.value }))}
              className="w-full mt-1 px-4 py-3 border border-cream-dark rounded-xl bg-surface text-navy outline-none focus:border-navy transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Телефон</label>
            <input
              type="tel"
              placeholder="+380"
              value={selected.phone ?? ''}
              onChange={(e) => setSelected((p) => ({ ...p, phone: e.target.value }))}
              className="w-full mt-1 px-4 py-3 border border-cream-dark rounded-xl bg-surface text-navy outline-none focus:border-navy transition-colors"
            />
          </div>
        </div>

        <button
          disabled={!selected.firstName || !selected.phone}
          onClick={() => setStep('confirm')}
          className="w-full bg-navy text-surface rounded-xl py-4 font-semibold text-base disabled:opacity-40"
        >
          Підтвердити →
        </button>
      </div>
    )
  }

  // ── Step: Confirm ─────────────────────────────────────
  if (step === 'confirm') {
    const date = new Date(selected.date!)
    const dateStr = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' })

    return (
      <div className="px-4 py-6">
        <h2 className="text-lg font-semibold text-navy mb-5">Перевірте запис</h2>

        <div className="bg-surface rounded-2xl border border-cream-dark p-5 space-y-3 mb-6">
          {/* Services list */}
          <div>
            <span className="text-sm text-muted">Послуги</span>
            <div className="mt-1 space-y-1">
              {selectedServices.map((s) => (
                <div key={s.id} className="flex justify-between">
                  <span className="text-sm text-navy">{s.name}</span>
                  <span className="text-sm text-navy">{s.price} ₴</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-cream-dark pt-3 space-y-2">
            <Row label="Дата" value={dateStr} />
            <Row label="Час" value={selected.time!} />
            <Row label="Тривалість" value={`${totalDuration} хв`} />
            <Row label="Вартість" value={`${totalPrice} ₴`} bold />
          </div>
          <div className="border-t border-cream-dark pt-3 space-y-2">
            <Row label="Ім'я" value={[selected.firstName, selected.lastName].filter(Boolean).join(' ')} />
            <Row label="Телефон" value={selected.phone!} />
          </div>
        </div>

        <button
          disabled={loading}
          onClick={handleSubmit}
          className="w-full bg-navy text-surface rounded-xl py-4 font-semibold text-base disabled:opacity-40"
        >
          {loading ? 'Зберігаємо...' : 'Підтвердити запис'}
        </button>
        <button
          onClick={() => setStep('contact')}
          className="w-full mt-2 text-muted py-2 text-sm"
        >
          Змінити
        </button>
      </div>
    )
  }

  // ── Step: Done ────────────────────────────────────────
  if (step === 'done') {
    const date = new Date(selected.date!)
    const dateStr = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
    const tgLink = `https://t.me/NailsbarTOP_bot?start=${appointmentId ?? 'booking'}`

    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-display text-navy mb-2">Запис підтверджено!</h2>
        <p className="text-muted mb-6">
          Чекаємо вас {dateStr} о {selected.time}
        </p>

        <div className="bg-surface rounded-2xl border border-cream-dark p-5 w-full max-w-sm text-left space-y-2 mb-6">
          {selectedServices.map((s) => (
            <Row key={s.id} label={s.name} value={`${s.price} ₴`} />
          ))}
          <div className="border-t border-cream-dark pt-2">
            <Row label="Дата" value={`${dateStr} о ${selected.time}`} />
            <Row label="Разом" value={`${totalPrice} ₴`} bold />
          </div>
        </div>

        {/* Telegram reminder block */}
        <div className="w-full max-w-sm bg-[#EFF7FF] rounded-2xl border border-[#D0E8FF] p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-navy mb-1">📱 Отримати нагадування</p>
          <p className="text-xs text-muted mb-3">
            Натисніть кнопку нижче, щоб наш Telegram-бот нагадав вам про запис за день і за годину.
          </p>
          <a
            href={tgLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-navy text-surface rounded-xl py-3 text-center text-sm font-semibold"
          >
            Підключити нагадування в Telegram →
          </a>
        </div>
      </div>
    )
  }

  return null
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm text-navy ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  )
}
