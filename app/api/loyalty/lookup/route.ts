import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLoyaltyState, normalizePhone } from '@/lib/loyalty'

// POST /api/loyalty/lookup
// Body either: { clientId } - load existing client by id
//   or:       { firstName, phone } - upsert by phone, return loyalty state
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    if (typeof body.clientId === 'string' && body.clientId.length > 0) {
      const state = await getLoyaltyState(body.clientId)
      if (!state) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      return NextResponse.json(state)
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
    if (!firstName || !phoneRaw) {
      return NextResponse.json({ error: 'firstName and phone required' }, { status: 400 })
    }
    const phone = normalizePhone(phoneRaw)
    if (!/^\+?\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }

    const client = await prisma.client.upsert({
      where: { phone },
      update: { firstName },
      create: { firstName, phone },
      select: { id: true },
    })
    const state = await getLoyaltyState(client.id)
    return NextResponse.json(state)
  } catch (e) {
    console.error('loyalty/lookup', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
