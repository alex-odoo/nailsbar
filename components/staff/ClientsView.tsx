'use client'

import { useState } from 'react'

type StampRecord = {
  id: string
  createdAt: string
  source: string
  staffName: string | null
}

type Loyalty = {
  cycleNumber: number
  cyclesRedeemed: number
  stamps: number
  target: number
  canRedeem: boolean
  todayStamps: number
  recentStamps: StampRecord[]
}

type Client = {
  id: string
  firstName: string
  lastName: string | null
  name: string  // computed display name (may omit last name per permission)
  phone: string
  notes: string | null
  _count: { appointments: number }
  appointments: {
    date: Date
    status: string
    service: { name: string }
  }[]
  loyalty: Loyalty
}

export default function ClientsView({ clients, isAdmin }: { clients: Client[]; isAdmin: boolean }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)
  // Local override so reset/stamp in the profile updates the badge in the
  // list view without a full reload.
  const [overrides, setOverrides] = useState<Record<string, Loyalty>>({})

  const merged = clients.map(c => overrides[c.id] ? { ...c, loyalty: overrides[c.id] } : c)
  const filtered = merged.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q),
  )

  if (selected) {
    const current = overrides[selected.id]
      ? { ...selected, loyalty: overrides[selected.id] }
      : selected
    return (
      <ClientProfile
        client={current}
        isAdmin={isAdmin}
        onBack={() => setSelected(null)}
        onLoyaltyChange={(l) => setOverrides(prev => ({ ...prev, [selected.id]: l }))}
      />
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-display text-navy mb-4">Клієнти</h1>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">🔍</span>
        <input
          type="search"
          placeholder="Ім'я або телефон..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full pl-9 pr-4 py-3 bg-surface border border-cream-dark rounded-xl text-navy outline-none focus:border-navy text-base"
          style={{ fontSize: '16px' }}
        />
      </div>

      <p className="text-xs text-muted mb-3">{filtered.length} клієнтів</p>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(client => {
          const last = client.appointments[0]
          const lastDate = last ? new Date(last.date).toLocaleDateString('uk-UA', {
            day: 'numeric', month: 'short',
          }) : null

          return (
            <button
              key={client.id}
              onClick={() => setSelected(client)}
              className="w-full bg-surface rounded-xl border border-cream-dark px-4 py-3 text-left flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-navy flex items-center gap-2">
                  {client.name}
                  {client.loyalty.todayStamps > 0 && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-success/15 text-success">
                      💅 сьогодні
                    </span>
                  )}
                  {client.loyalty.canRedeem && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-navy text-cream">
                      −50%
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">{client.phone}</p>
                <p className="text-xs text-muted mt-0.5">
                  💅 {client.loyalty.stamps}/{client.loyalty.target}
                  {lastDate && <> · Останній: {last.service.name}, {lastDate}</>}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-2xl font-bold text-navy">{client._count.appointments}</p>
                <p className="text-xs text-muted">візитів</p>
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p className="text-4xl mb-2">👤</p>
          <p className="text-sm">Клієнтів не знайдено</p>
        </div>
      )}
    </div>
  )
}

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

function ClientProfile({
  client,
  isAdmin,
  onBack,
  onLoyaltyChange,
}: {
  client: Client
  isAdmin: boolean
  onBack: () => void
  onLoyaltyChange: (l: Loyalty) => void
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const loyalty = client.loyalty

  async function addStamp() {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/loyalty/staff/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      if (!res.ok) { setMsg('Помилка'); return }
      const data = await res.json()
      onLoyaltyChange({
        cycleNumber: data.state.cycleNumber,
        cyclesRedeemed: data.state.cyclesRedeemed,
        stamps: data.state.stamps,
        target: data.state.target,
        canRedeem: data.state.canRedeem,
        todayStamps: data.state.todayStamps ?? loyalty.todayStamps + 1,
        recentStamps: data.state.recentStamps ?? loyalty.recentStamps,
      })
      setMsg(data.reason === 'cycle_full' ? 'Картка вже заповнена' : '+1 штамп')
      setTimeout(() => setMsg(''), 2200)
    } finally { setBusy(false) }
  }

  async function deleteOne(stampId: string) {
    if (!confirm('Видалити цей штамп?')) return
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/loyalty/staff/stamp/${stampId}`, { method: 'DELETE' })
      if (res.status === 403) { setMsg('Тільки адмін'); return }
      if (!res.ok) { setMsg('Не вдалося видалити'); return }
      const data = await res.json()
      onLoyaltyChange({
        cycleNumber: data.state.cycleNumber,
        cyclesRedeemed: data.state.cyclesRedeemed,
        stamps: data.state.stamps,
        target: data.state.target,
        canRedeem: data.state.canRedeem,
        todayStamps: data.state.todayStamps ?? loyalty.todayStamps,
        recentStamps: data.state.recentStamps ?? loyalty.recentStamps,
      })
      setMsg('Штамп видалено')
      setTimeout(() => setMsg(''), 2500)
    } finally { setBusy(false) }
  }

  async function clearCycle() {
    if (!confirm(`Очистити поточний цикл штампів для ${client.name}?`)) return
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/loyalty/staff/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      if (res.status === 403) { setMsg('Тільки адмін може очистити'); return }
      if (!res.ok) { setMsg('Не вдалося очистити'); return }
      const data = await res.json()
      onLoyaltyChange({
        cycleNumber: data.state.cycleNumber,
        cyclesRedeemed: data.state.cyclesRedeemed,
        stamps: data.state.stamps,
        target: data.state.target,
        canRedeem: data.state.canRedeem,
        todayStamps: data.state.todayStamps ?? 0,
        recentStamps: data.state.recentStamps ?? [],
      })
      setMsg(`Очищено ${data.removed} штамп(ів)`)
      setTimeout(() => setMsg(''), 3000)
    } finally { setBusy(false) }
  }

  return (
    <div className="px-4 py-6">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted mb-5">
        ← Всі клієнти
      </button>

      {/* Header */}
      <div className="bg-navy text-cream rounded-2xl px-5 py-5 mb-4">
        <p className="text-2xl font-display mb-1">{client.name}</p>
        <a href={`tel:${client.phone}`} className="text-cream/70 text-sm">
          {client.phone}
        </a>
        <p className="text-sm text-cream/60 mt-2">
          {client._count.appointments} візитів
        </p>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="bg-surface border border-cream-dark rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-muted uppercase tracking-wide mb-1">Нотатки</p>
          <p className="text-sm text-navy">{client.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-5">
        <a
          href={`tel:${client.phone}`}
          className="flex-1 bg-surface border border-cream-dark rounded-xl py-3 text-center text-sm font-medium text-navy"
        >
          📞 Зателефонувати
        </a>
        <a
          href={`https://t.me/${client.phone.replace('+', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-surface border border-cream-dark rounded-xl py-3 text-center text-sm font-medium text-navy"
        >
          ✈️ Telegram
        </a>
      </div>

      {/* Loyalty */}
      <div className="bg-surface border border-cream-dark rounded-2xl px-4 py-4 mb-5">
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-xs text-muted uppercase tracking-wide">Картка лояльності</p>
          {loyalty.todayStamps > 0 && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-success/15 text-success">
              💅 сьогодні +{loyalty.todayStamps}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-navy">{loyalty.stamps}</span>
          <span className="text-sm text-muted">/ {loyalty.target} штампів</span>
        </div>
        <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-navy rounded-full transition-all"
            style={{ width: `${Math.min((loyalty.stamps / loyalty.target) * 100, 100)}%` }}
          />
        </div>
        {loyalty.cyclesRedeemed > 0 && (
          <p className="text-xs text-muted">
            Цикл №{loyalty.cycleNumber} · нагород отримано: {loyalty.cyclesRedeemed}
          </p>
        )}
        {loyalty.canRedeem && (
          <p className="text-xs font-semibold text-success mt-1">
            Картка заповнена - клієнту належить −50%
          </p>
        )}

        {loyalty.recentStamps.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-muted mb-1">Останні штампи</p>
            <div className="space-y-1">
              {loyalty.recentStamps.slice(0, 6).map(s => (
                <div key={s.id} className="text-xs text-navy flex justify-between items-center">
                  <span>💅 {formatStampDate(s.createdAt)}</span>
                  <span className="flex items-center gap-2 text-muted">
                    <span>{s.staffName ?? '—'}{s.source === 'auto_appointment' && ' · авто'}</span>
                    {isAdmin && (
                      <button
                        onClick={() => deleteOne(s.id)}
                        disabled={busy}
                        aria-label="Видалити штамп"
                        className="w-5 h-5 flex items-center justify-center rounded-full text-error border border-error/25 hover:bg-error/10 disabled:opacity-40 text-xs"
                      >
                        ×
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {msg && <p className="text-xs font-medium text-navy mt-3">{msg}</p>}

        <div className="flex gap-2 mt-3">
          <button
            onClick={addStamp}
            disabled={busy || loyalty.canRedeem}
            className="flex-1 bg-navy text-cream rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
          >
            {loyalty.canRedeem ? 'Заповнена' : busy ? '...' : '+1 штамп'}
          </button>
          {isAdmin && loyalty.stamps > 0 && (
            <button
              onClick={clearCycle}
              disabled={busy}
              className="px-3 text-sm font-medium text-error border border-error/30 rounded-lg hover:bg-error/5 disabled:opacity-40"
            >
              Очистити
            </button>
          )}
        </div>
      </div>

      {/* History */}
      <p className="text-xs text-muted uppercase tracking-wide mb-2">Історія записів</p>
      {client.appointments.length === 0 ? (
        <p className="text-sm text-muted">Немає записів</p>
      ) : (
        <div className="space-y-2">
          {client.appointments.map((appt, i) => (
            <div key={i} className="bg-surface border border-cream-dark rounded-xl px-4 py-3 flex justify-between">
              <div>
                <p className="text-sm font-medium text-navy">{appt.service.name}</p>
                <p className="text-xs text-muted">
                  {new Date(appt.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full self-start mt-0.5
                ${appt.status === 'DONE' ? 'bg-green-50 text-green-700' :
                  appt.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'}`}
              >
                {appt.status === 'DONE' ? 'Виконано' :
                 appt.status === 'CANCELLED' ? 'Скасовано' : 'Заплановано'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
