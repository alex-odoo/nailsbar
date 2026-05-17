import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { getLoyaltyState } from '@/lib/loyalty'

// DELETE /api/loyalty/staff/stamp/[stampId]
// Admin-only. Removes a single stamp by id and returns the refreshed
// loyalty state (with history) for the affected client so the UI can
// update without a second round-trip.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ stampId: string }> },
) {
  try {
    await requireAdmin()
    const { stampId } = await params
    if (!stampId) {
      return NextResponse.json({ error: 'stampId required' }, { status: 400 })
    }

    const stamp = await prisma.loyaltyStamp.findUnique({
      where: { id: stampId },
      select: { id: true, clientId: true },
    })
    if (!stamp) {
      return NextResponse.json({ error: 'Stamp not found' }, { status: 404 })
    }

    await prisma.loyaltyStamp.delete({ where: { id: stampId } })
    const state = await getLoyaltyState(stamp.clientId, { includeHistory: true })
    return NextResponse.json({ state, removed: 1 })
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: e.message }, { status: e.message === 'Forbidden' ? 403 : 401 })
    }
    console.error('loyalty/staff/stamp delete', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
