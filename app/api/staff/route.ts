import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, hashPin } from '@/lib/auth'

// POST /api/staff — create a new master (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const { name, phone, pin } = await req.json()

    if (!name || !phone || !pin) {
      return NextResponse.json({ error: 'name, phone and pin required' }, { status: 400 })
    }
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 6 digits' }, { status: 400 })
    }

    const existing = await prisma.staff.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
    }

    const staff = await prisma.staff.create({
      data: {
        name,
        phone,
        role: 'MASTER',
        pinHash: await hashPin(pin),
      },
      select: { id: true, name: true, phone: true, role: true, isActive: true,
        canCreateAppointments: true, canSeeClientLastName: true, canSeeClientPhone: true },
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (e: any) {
    const status = e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
