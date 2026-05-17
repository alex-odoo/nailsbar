import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLoyaltyState, normalizePhone } from '@/lib/loyalty'
import { notifyNewLoyaltyClient } from '@/lib/telegram'

// POST /api/loyalty/lookup
// Body modes:
//   { clientId }            - fetch by id (returns 404 if missing)
//   { phone }               - find by phone only (returns 404 with not_found
//                             so the UI can ask for a name to create one)
//   { firstName, phone }    - upsert by phone (creates a card if missing)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const includeHistory = body?.history === true

    if (typeof body.clientId === 'string' && body.clientId.length > 0) {
      const state = await getLoyaltyState(body.clientId, { includeHistory })
      if (!state) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      return NextResponse.json(state)
    }

    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
    if (!phoneRaw) {
      return NextResponse.json({ error: 'phone required' }, { status: 400 })
    }
    const phone = normalizePhone(phoneRaw)
    if (!/^\+?\d{10,15}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }

    const firstNameRaw = typeof body.firstName === 'string' ? body.firstName.trim() : ''

    if (!firstNameRaw) {
      // Phone-only lookup: do not create the client, signal missing so the
      // UI can fall back to a name prompt.
      const existing = await prisma.client.findUnique({
        where: { phone },
        select: { id: true },
      })
      if (!existing) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      const state = await getLoyaltyState(existing.id, { includeHistory })
      return NextResponse.json(state)
    }

    // Detect first-time signup so we can ping Telegram only on creation.
    const existing = await prisma.client.findUnique({
      where: { phone },
      select: { id: true },
    })
    const client = await prisma.client.upsert({
      where: { phone },
      update: { firstName: firstNameRaw },
      create: { firstName: firstNameRaw, phone },
      select: { id: true },
    })
    if (!existing) {
      // Fire-and-forget: do not block the response on Telegram latency
      void notifyNewLoyaltyClient({ name: firstNameRaw, phone })
    }
    const state = await getLoyaltyState(client.id, { includeHistory })
    return NextResponse.json(state)
  } catch (e) {
    console.error('loyalty/lookup', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
