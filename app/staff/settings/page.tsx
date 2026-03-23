import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SettingsView from '@/components/staff/SettingsView'

export default async function SettingsPage() {
  const session = await requireAuth()

  const services = await prisma.service.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })

  const staffList = await prisma.staff.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      isActive: true,
      canCreateAppointments: true,
      canSeeClientLastName: true,
      canSeeClientPhone: true,
    },
  })

  // Get current user's phone for account tab
  const currentStaff = await prisma.staff.findUnique({
    where: { id: session.id },
    select: { phone: true },
  })

  return (
    <SettingsView
      services={services}
      staffList={staffList}
      currentRole={session.role}
      currentId={session.id}
      currentName={session.name}
      currentPhone={currentStaff?.phone ?? null}
    />
  )
}
