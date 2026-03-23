import { requireAuth, clientDisplayName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import WeekView from '@/components/staff/WeekView'

export default async function WeekPage() {
  const session = await requireAuth()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const appointments = await prisma.appointment.findMany({
    where: {
      date: { gte: today, lte: weekEnd },
      ...(session.role === 'MASTER' ? { staffId: session.id } : {}),
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    include: {
      client: { select: { firstName: true, lastName: true, phone: true } },
      service: { select: { name: true, duration: true, price: true } },
      staff: { select: { name: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  // Mask client data server-side
  const maskedAppts = appointments.map((a) => ({
    ...a,
    client: {
      name:  clientDisplayName(a.client.firstName, a.client.lastName, session.canSeeClientLastName),
      phone: session.canSeeClientPhone ? a.client.phone : '——',
    },
  }))

  // Group by date
  const byDate: Record<string, typeof maskedAppts> = {}
  for (const appt of maskedAppts) {
    const key = new Date(appt.date).toISOString().split('T')[0]
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(appt)
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const key = d.toISOString().split('T')[0]
    return { date: d, key, appointments: byDate[key] ?? [] }
  })

  const permissions = {
    canCreateAppointments: session.canCreateAppointments,
    canSeeClientPhone: session.canSeeClientPhone,
    canSeeClientLastName: session.canSeeClientLastName,
  }

  return <WeekView days={days} permissions={permissions} />
}
