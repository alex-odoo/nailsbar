import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { awardStamp } from '@/lib/loyalty'

// POST /api/loyalty/staff/stamp { clientId }
// Authenticated staff only. PIN-free shortcut used by /staff/loyalty so
// the master can stamp clients without retyping their PIN on every visit.
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { clientId } = await req.json().catch(() => ({}))
    if (typeof clientId !== 'string' || !clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const result = await awardStamp({
      clientId,
      staffId: session.id,
      source: 'manual',
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('loyalty/staff/stamp', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
