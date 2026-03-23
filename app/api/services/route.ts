import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'

// GET /api/services — публічний (для booking wizard)
export async function GET() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true, name: true, category: true,
      duration: true, price: true, description: true,
    },
  })
  return NextResponse.json(services)
}

// POST /api/services — тільки admin
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()
    const { name, category, duration, price, description } = body

    if (!name || !category || !duration || !price) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const service = await prisma.service.create({
      data: { name, category, duration: +duration, price: +price, description },
    })
    return NextResponse.json(service, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 403 })
  }
}
