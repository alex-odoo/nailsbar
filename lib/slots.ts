import { prisma } from './prisma'

/**
 * Повертає список вільних часових слотів для майстра на конкретну дату
 * з урахуванням тривалості послуги.
 */
export async function getAvailableSlots(
  staffId: string,
  date: Date,
  serviceDuration: number  // хвилини
): Promise<string[]> {
  const dateOnly = new Date(date.toDateString())

  // Отримуємо розклад майстра на день
  const schedule = await prisma.schedule.findUnique({
    where: { staffId_date: { staffId, date: dateOnly } },
  })

  if (!schedule || !schedule.isWorking) return []

  // Отримуємо вже зайняті записи на цей день
  const existing = await prisma.appointment.findMany({
    where: {
      staffId,
      date: dateOnly,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { startTime: true, endTime: true },
  })

  const breaks: { from: string; to: string }[] = schedule.breaks
    ? typeof schedule.breaks === 'string'
      ? JSON.parse(schedule.breaks)
      : (schedule.breaks as any)
    : []

  // Генеруємо слоти по 30 хвилин
  const slots: string[] = []
  const [startH, startM] = schedule.startTime.split(':').map(Number)
  const [endH, endM] = schedule.endTime.split(':').map(Number)

  let current = startH * 60 + startM
  const end = endH * 60 + endM

  const toTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, '0')
    const m = (min % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const isBlocked = (slotStart: number, slotEnd: number) => {
    // перевіряємо перетин з існуючими записами
    for (const appt of existing) {
      const aStart = toMin(appt.startTime)
      const aEnd = toMin(appt.endTime)
      if (slotStart < aEnd && slotEnd > aStart) return true
    }
    // перевіряємо перетин з перервами
    for (const b of breaks) {
      const bStart = toMin(b.from)
      const bEnd = toMin(b.to)
      if (slotStart < bEnd && slotEnd > bStart) return true
    }
    return false
  }

  while (current + serviceDuration <= end) {
    const slotEnd = current + serviceDuration
    if (!isBlocked(current, slotEnd)) {
      slots.push(toTime(current))
    }
    current += 30 // крок 30 хвилин
  }

  return slots
}
