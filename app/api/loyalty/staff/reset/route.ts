import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { getLoyaltyState } from '@/lib/loyalty'

// POST /api/loyalty/staff/reset { clientId }
// Admin-only. Deletes all stamps in the client's CURRENT cycle (the one
// that hasn't been redeemed yet). Past, already-redeemed cycles stay in
// place because they represent real history.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { clientId } = await req.json().catch(() => ({}))
    if (typeof clientId !== 'string' || !clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, loyaltyCyclesRedeemed: true },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const currentCycle = client.loyaltyCyclesRedeemed + 1
    const result = await prisma.loyaltyStamp.deleteMany({
      where: { clientId: client.id, cycleNumber: currentCycle },
    })

    const state = await getLoyaltyState(client.id, { includeHistory: true })
    return NextResponse.json({ state, removed: result.count })
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: e.message }, { status: e.message === 'Forbidden' ? 403 : 401 })
    }
    console.error('loyalty/staff/reset', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
