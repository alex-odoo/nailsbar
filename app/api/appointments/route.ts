import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, clientDisplayName } from '@/lib/auth'
import { notifyNewAppointment } from '@/lib/telegram'

// GET /api/appointments?date=2024-03-25&staffId=xxx&status=PENDING
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const status = searchParams.get('status')

  const where: any = {}
  if (date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    where.date = d
  }
  if (status) where.status = status
  if (session.role === 'MASTER') where.staffId = session.id

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      client: { select: { firstName: true, lastName: true, phone: true, notes: true } },
      service: { select: { name: true, duration: true, price: true, category: true } },
      staff: { select: { name: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })

  const masked = appointments.map((a) => ({
    ...a,
    client: {
      ...a.client,
      name: clientDisplayName(a.client.firstName, a.client.lastName, session.canSeeClientLastName),
      phone: session.canSeeClientPhone ? a.client.phone : '——',
    },
  }))

  return NextResponse.json(masked)
}

// POST /api/appointments — публічне (клієнт бронює)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { serviceId, staffId, date, startTime, clientFirstName, clientLastName, clientPhone, notes, totalDuration } = body

    if (!serviceId || !staffId || !date || !startTime || !clientFirstName || !clientPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const phone = clientPhone.replace(/\s/g, '').replace(/^380/, '+380').replace(/^0/, '+380')

    const client = await prisma.client.upsert({
      where: { phone },
      update: { firstName: clientFirstName, ...(clientLastName ? { lastName: clientLastName } : {}) },
      create: { firstName: clientFirstName, lastName: clientLastName ?? null, phone },
    })

    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } })
    const duration = totalDuration ?? service.duration
    const [h, m] = startTime.split(':').map(Number)
    const endMin = h * 60 + m + duration
    const endTime = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`

    const appointmentDate = new Date(date)
    appointmentDate.setHours(0, 0, 0, 0)

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        staffId,
        serviceId,
        date: appointmentDate,
        startTime,
        endTime,
        notes: notes ?? null,
        status: 'PENDING',
      },
      include: { staff: { select: { name: true } } },
    })

    const dateLabel = appointmentDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' })
    const clientFullName = clientLastName ? `${clientFirstName} ${clientLastName}` : clientFirstName
    const serviceNames = body.extraServiceIds?.length
      ? `${service.name} + ще ${body.extraServiceIds.length}`
      : service.name
    notifyNewAppointment({
      clientName: clientFullName,
      clientPhone: phone,
      serviceName: serviceNames,
      date: dateLabel,
      time: startTime,
      masterName: appointment.staff.name,
    }).catch(console.error)

    return NextResponse.json({ ok: true, id: appointment.id }, { status: 201 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
