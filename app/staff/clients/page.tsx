import { requireAuth, clientDisplayName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CARD_SIZE } from '@/lib/loyalty'
import ClientsView from '@/components/staff/ClientsView'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const session = await requireAuth()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

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
      loyaltyStamps: {
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: {
          id: true,
          cycleNumber: true,
          source: true,
          createdAt: true,
          staff: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  const masked = clients.map((c) => {
    const currentCycle = c.loyaltyCyclesRedeemed + 1
    const stampsInCycle = c.loyaltyStamps.filter(s => s.cycleNumber === currentCycle).length
    const todayStamps = c.loyaltyStamps.filter(s => s.createdAt >= startOfToday).length
    return {
      ...c,
      name: clientDisplayName(c.firstName, c.lastName, session.canSeeClientLastName),
      lastName: session.canSeeClientLastName ? c.lastName : null,
      phone: session.canSeeClientPhone ? c.phone : '——',
      loyalty: {
        cycleNumber: currentCycle,
        cyclesRedeemed: c.loyaltyCyclesRedeemed,
        stamps: stampsInCycle,
        target: CARD_SIZE,
        canRedeem: stampsInCycle >= CARD_SIZE,
        todayStamps,
        recentStamps: c.loyaltyStamps.map(s => ({
          id: s.id,
          createdAt: s.createdAt.toISOString(),
          source: s.source,
          cycleNumber: s.cycleNumber,
          staffName: s.staff?.name ?? null,
        })),
      },
    }
  })

  return <ClientsView clients={masked} isAdmin={session.role === 'ADMIN'} />
}
