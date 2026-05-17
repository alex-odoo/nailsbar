import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CARD_SIZE, getLoyaltyState, verifyStaffPin } from '@/lib/loyalty'

// POST /api/loyalty/redeem  { clientId, pin } -> close current cycle (after 9 stamps)
export async function POST(req: NextRequest) {
  try {
    const { clientId, pin } = await req.json().catch(() => ({}))
    if (typeof clientId !== 'string' || typeof pin !== 'string') {
      return NextResponse.json({ error: 'clientId and pin required' }, { status: 400 })
    }

    const staff = await verifyStaffPin(pin)
    if (!staff) {
      return NextResponse.json({ error: 'Невірний пін-код' }, { status: 401 })
    }

    const state = await getLoyaltyState(clientId)
    if (!state) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    if (state.stamps < CARD_SIZE) {
      return NextResponse.json({ error: 'Карта не заповнена' }, { status: 400 })
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { loyaltyCyclesRedeemed: { increment: 1 } },
    })

    const fresh = await getLoyaltyState(clientId)
    return NextResponse.json({ state: fresh!, redeemed: true })
  } catch (e) {
    console.error('loyalty/redeem', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
