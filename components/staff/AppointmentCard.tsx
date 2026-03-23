'use client'

import { useState } from 'react'

type Appointment = {
  id: string
  startTime: string
  endTime: string
  status: string
  client: { name: string; phone: string }
  service: { name: string; duration: number; price: number }
  staff: { name: string }
}

type Permissions = {
  canCreateAppointments: boolean
  canSeeClientPhone: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Очікує',     color: 'text-yellow-700 bg-yellow-50' },
  CONFIRMED: { label: 'Підтвердж',  color: 'text-blue-700 bg-blue-50' },
  ARRIVED:   { label: 'Прийшов',    color: 'text-purple-700 bg-purple-50' },
  DONE:      { label: 'Виконано',   color: 'text-green-700 bg-green-50' },
  CANCELLED: { label: 'Скасовано', color: 'text-red-700 bg-red-50' },
  NO_SHOW:   { label: 'Не прийшов', color: 'text-gray-500 bg-gray-100' },
}

const NEXT_STATUS: Record<string, string> = {
  PENDING:   'CONFIRMED',
  CONFIRMED: 'ARRIVED',
  ARRIVED:   'DONE',
}

export default function AppointmentCard({
  appointment,
  permissions,
}: {
  appointment: Appointment
  permissions: Permissions
}) {
  const [status, setStatus] = useState(appointment.status)
  const [loading, setLoading] = useState(false)

  const s = STATUS_LABELS[status] ?? STATUS_LABELS.PENDING
  const next = NEXT_STATUS[status]
  const canEdit = permissions.canCreateAppointments
  const canPhone = permissions.canSeeClientPhone

  async function advance() {
    if (!next || loading || !canEdit) return
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) setStatus(next)
    setLoading(false)
  }

  async function cancel() {
    if (loading || !canEdit) return
    setLoading(true)
    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED' }),
    })
    if (res.ok) setStatus('CANCELLED')
    setLoading(false)
  }

  // Whether to show the action bar
  const showActions = next && status !== 'CANCELLED' && status !== 'DONE'

  return (
    <div className={`bg-surface rounded-xl border border-cream-dark shadow-sm overflow-hidden ${status === 'CANCELLED' || status === 'NO_SHOW' ? 'opacity-50' : ''}`}>
      {/* Time bar */}
      <div className="flex items-center px-4 py-3 border-b border-cream-dark">
        <span className="font-mono text-lg font-bold text-navy w-14">{appointment.startTime}</span>
        <span className="text-xs text-muted ml-1">→ {appointment.endTime}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
          {s.label}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="font-semibold text-navy">{appointment.client.name}</p>
        <p className="text-sm text-muted">{appointment.service.name} · {appointment.service.duration} хв · {appointment.service.price} ₴</p>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex border-t border-cream-dark">
          {canEdit && (
            <button
              onClick={cancel}
              disabled={loading}
              className="flex-1 py-2.5 text-xs text-error font-medium border-r border-cream-dark"
            >
              Скасувати
            </button>
          )}

          {canPhone && appointment.client.phone !== '——' ? (
            <a
              href={`tel:${appointment.client.phone}`}
              className={`flex-1 py-2.5 text-xs text-muted font-medium text-center ${canEdit ? 'border-r border-cream-dark' : ''}`}
            >
              📞 Зателефонувати
            </a>
          ) : (
            <span className={`flex-1 py-2.5 text-xs text-muted/40 font-medium text-center ${canEdit ? 'border-r border-cream-dark' : ''}`}>
              📞 —
            </span>
          )}

          {canEdit && next && (
            <button
              onClick={advance}
              disabled={loading}
              className="flex-1 py-2.5 text-xs text-navy font-semibold"
            >
              {STATUS_LABELS[next]?.label} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
