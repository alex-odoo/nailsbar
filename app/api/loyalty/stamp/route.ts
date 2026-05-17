import { NextRequest, NextResponse } from 'next/server'
import { awardStamp, verifyStaffPin } from '@/lib/loyalty'

// POST /api/loyalty/stamp  { clientId, pin } -> add 1 stamp after PIN check
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

    const result = await awardStamp({
      clientId,
      staffId: staff.id,
      source: 'manual',
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('loyalty/stamp', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
