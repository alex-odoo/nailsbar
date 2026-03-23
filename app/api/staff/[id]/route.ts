import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, hashPin } from '@/lib/auth'

// PATCH /api/staff/:id
// - Admin can update any field for any staff member
// - A staff member can update their own name, phone, and PIN only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const isSelf = session.id === id
    const isAdmin = session.role === 'ADMIN'

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}

    // Self or admin: can update name, phone, pin
    if (body.name !== undefined)  data.name = body.name
    if (body.phone !== undefined) data.phone = body.phone

    if (body.pin !== undefined) {
      if (!/^\d{6}$/.test(body.pin)) {
        return NextResponse.json({ error: 'PIN must be 6 digits' }, { status: 400 })
      }
      data.pinHash = await hashPin(body.pin)
    }

    // Admin only: permissions and active status
    if (isAdmin) {
      if (body.isActive !== undefined)               data.isActive = body.isActive
      if (body.canCreateAppointments !== undefined)  data.canCreateAppointments = body.canCreateAppointments
      if (body.canSeeClientLastName !== undefined)   data.canSeeClientLastName = body.canSeeClientLastName
      if (body.canSeeClientPhone !== undefined)      data.canSeeClientPhone = body.canSeeClientPhone
    }

    const staff = await prisma.staff.update({
      where: { id },
      data,
      select: {
        id: true, name: true, phone: true, role: true, isActive: true,
        canCreateAppointments: true, canSeeClientLastName: true, canSeeClientPhone: true,
      },
    })

    return NextResponse.json(staff)
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
