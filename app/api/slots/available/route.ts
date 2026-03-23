import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/slots'

// GET /api/slots/available?date=2024-03-25&duration=90&staffId=xxx
// Also supports legacy: &serviceId=xxx (single service)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const staffId = searchParams.get('staffId')
  const durationParam = searchParams.get('duration')
  const serviceId = searchParams.get('serviceId')

  if (!date) {
    return NextResponse.json({ error: 'date required' }, { status: 400 })
  }

  let duration: number

  if (durationParam) {
    duration = parseInt(durationParam, 10)
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json({ error: 'invalid duration' }, { status: 400 })
    }
  } else if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    duration = service.duration
  } else {
    return NextResponse.json({ error: 'duration or serviceId required' }, { status: 400 })
  }

  let targetStaffId: string = staffId ?? ''
  if (!targetStaffId) {
    const anyStaff = await prisma.staff.findFirst({ where: { isActive: true }, select: { id: true } })
    if (!anyStaff) return NextResponse.json({ slots: [] })
    targetStaffId = anyStaff.id
  }

  const slots = await getAvailableSlots(targetStaffId, new Date(date), duration)
  return NextResponse.json({ slots })
}
