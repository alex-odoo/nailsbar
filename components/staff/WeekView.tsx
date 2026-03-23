'use client'

import { useState } from 'react'
import AppointmentCard from './AppointmentCard'

type Appt = {
  id: string
  startTime: string
  endTime: string
  status: string
  client: { name: string; phone: string }
  service: { name: string; duration: number; price: number }
  staff: { name: string }
}

type Day = {
  date: Date
  key: string
  appointments: Appt[]
}

type Permissions = {
  canCreateAppointments: boolean
  canSeeClientPhone: boolean
}

const DAY_NAMES = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTH_NAMES = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд']

export default function WeekView({ days, permissions }: { days: Day[]; permissions: Permissions }) {
  const [selected, setSelected] = useState(0)
  const day = days[selected]
  const totalRevenue = day.appointments
    .filter(a => a.status === 'DONE')
    .reduce((s: number, a) => s + a.service.price, 0)

  return (
    <div className="flex flex-col h-full px-4 py-6">
      <h1 className="text-2xl font-display text-navy mb-5">Тиждень</h1>

      {/* Day selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4">
        {days.map((d, i) => {
          const date = new Date(d.date)
          const isToday = i === 0
          const active = i === selected
          const hasAppts = d.appointments.length > 0

          return (
            <button
              key={d.key}
              onClick={() => setSelected(i)}
              className={`shrink-0 flex flex-col items-center w-14 py-2.5 rounded-2xl border-2 transition-all
                ${active
                  ? 'bg-navy border-navy text-cream'
                  : 'bg-surface border-cream-dark text-navy'
                }
              `}
            >
              <span className="text-xs opacity-70">{DAY_NAMES[date.getDay()]}</span>
              <span className="text-xl font-bold leading-tight">{date.getDate()}</span>
              <span className="text-xs opacity-70">{MONTH_NAMES[date.getMonth()]}</span>
              {hasAppts && (
                <span className={`mt-1 w-1.5 h-1.5 rounded-full ${active ? 'bg-cream' : 'bg-navy'}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day header */}
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="font-semibold text-navy capitalize">
            {new Date(day.date).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-sm text-muted">{day.appointments.length} записів</p>
        </div>
        {totalRevenue > 0 && (
          <span className="text-sm font-semibold text-navy bg-cream-dark px-3 py-1 rounded-full">
            {totalRevenue} ₴
          </span>
        )}
      </div>

      {/* Appointments */}
      {day.appointments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted py-12">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">Записів немає</p>
        </div>
      ) : (
        <div className="space-y-3">
          {day.appointments.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt} permissions={permissions} />
          ))}
        </div>
      )}
    </div>
  )
}
