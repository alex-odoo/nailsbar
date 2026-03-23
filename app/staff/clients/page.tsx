import { requireAuth, clientDisplayName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ClientsView from '@/components/staff/ClientsView'

export default async function ClientsPage() {
  const session = await requireAuth()

  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { date: 'desc' },
        take: 3,
        select: {
          date: true,
          status: true,
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  const masked = clients.map((c) => ({
    ...c,
    name: clientDisplayName(c.firstName, c.lastName, session.canSeeClientLastName),
    lastName: session.canSeeClientLastName ? c.lastName : null,
    phone: session.canSeeClientPhone ? c.phone : '——',
  }))

  return <ClientsView clients={masked} />
}
