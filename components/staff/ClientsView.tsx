'use client'

import { useState } from 'react'

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
}

export default function ClientsView({ clients }: { clients: Client[] }) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q)
  )

  if (selected) {
    return <ClientProfile client={selected} onBack={() => setSelected(null)} />
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
                <p className="font-semibold text-navy">{client.name}</p>
                <p className="text-sm text-muted">{client.phone}</p>
                {lastDate && (
                  <p className="text-xs text-muted mt-0.5">
                    Останній: {last.service.name} · {lastDate}
                  </p>
                )}
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

function ClientProfile({ client, onBack }: { client: Client; onBack: () => void }) {
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

      {/* History */}
      <p className="text-xs text-muted uppercase tracking-wide mb-2">Історія</p>
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
