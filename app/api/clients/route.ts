import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, clientDisplayName } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const q = req.nextUrl.searchParams.get('q')?.trim()

    const clients = await prisma.client.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {},
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
      take: 50,
    })

    const masked = clients.map((c) => ({
      ...c,
      firstName: c.firstName,
      lastName: session.canSeeClientLastName ? c.lastName : null,
      name: clientDisplayName(c.firstName, c.lastName, session.canSeeClientLastName),
      phone: session.canSeeClientPhone ? c.phone : '——',
    }))

    return NextResponse.json(masked)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
