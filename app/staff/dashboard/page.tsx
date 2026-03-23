import { requireAuth, clientDisplayName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppointmentCard from '@/components/staff/AppointmentCard'

export default async function DashboardPage() {
  const session = await requireAuth()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const appointments = await prisma.appointment.findMany({
    where: {
      date: today,
      ...(session.role === 'MASTER' ? { staffId: session.id } : {}),
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    include: {
      client: { select: { firstName: true, lastName: true, phone: true } },
      service: { select: { name: true, duration: true, price: true } },
      staff: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  const revenue = appointments
    .filter((a) => a.status === 'DONE')
    .reduce((sum: number, a) => sum + a.service.price, 0)

  const dateLabel = today.toLocaleDateString('uk-UA', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const permissions = {
    canCreateAppointments: session.canCreateAppointments,
    canSeeClientPhone: session.canSeeClientPhone,
    canSeeClientLastName: session.canSeeClientLastName,
  }

  // Mask client data server-side for masters
  const maskedAppts = appointments.map((a) => ({
    ...a,
    client: {
      name:  clientDisplayName(a.client.firstName, a.client.lastName, session.canSeeClientLastName),
      phone: session.canSeeClientPhone ? a.client.phone : '——',
    },
  }))

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-display text-navy capitalize">Сьогодні</h1>
          <p className="text-sm text-muted mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Записів</p>
          <p className="text-2xl font-bold text-navy">{appointments.length}</p>
        </div>
      </div>

      {/* Stats */}
      {revenue > 0 && (
        <div className="bg-navy text-cream rounded-xl px-4 py-3 mb-5 flex justify-between items-center">
          <span className="text-sm opacity-70">Виручка</span>
          <span className="font-bold text-lg">{revenue} ₴</span>
        </div>
      )}

      {/* Appointments */}
      {maskedAppts.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-5xl mb-4">✨</p>
          <p className="text-sm">Записів немає</p>
        </div>
      ) : (
        <div className="space-y-3">
          {maskedAppts.map((appt) => (
            <AppointmentCard key={appt.id} appointment={appt as any} permissions={permissions} />
          ))}
        </div>
      )}

      {/* Quick new booking FAB — only if allowed */}
      {permissions.canCreateAppointments && (
        <a
          href="/staff/clients?new=1"
          className="fixed bottom-24 right-4 w-14 h-14 bg-navy text-cream rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
          aria-label="Новий запис"
        >
          +
        </a>
      )}
    </div>
  )
}
