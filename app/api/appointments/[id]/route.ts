import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { awardStamp } from '@/lib/loyalty'

// PATCH /api/appointments/:id — змінити статус
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const { status, notes } = await req.json()

    const validStatuses = ['PENDING', 'CONFIRMED', 'ARRIVED', 'DONE', 'CANCELLED', 'NO_SHOW']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Майстер може міняти тільки свої записи
    if (session.role === 'MASTER' && appointment.staffId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Перевірка права на зміну записів
    if (session.role === 'MASTER' && !session.canCreateAppointments) {
      return NextResponse.json({ error: 'No permission to edit appointments' }, { status: 403 })
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    })

    // Loyalty: award one stamp on the first transition into DONE.
    // appointmentId is @unique on LoyaltyStamp, so the helper is safe to retry.
    if (status === 'DONE' && appointment.status !== 'DONE') {
      try {
        await awardStamp({
          clientId: updated.clientId,
          staffId: session.id,
          source: 'auto_appointment',
          appointmentId: updated.id,
        })
      } catch (e) {
        console.error('loyalty auto-stamp failed', e)
      }
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE /api/appointments/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (session.role === 'MASTER' && appointment.staffId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (session.role === 'MASTER' && !session.canCreateAppointments) {
      return NextResponse.json({ error: 'No permission to edit appointments' }, { status: 403 })
    }

    await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
