import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Normalize phone: ensure it starts with +
function normalizePhone(phone: string): string[] {
  const digits = phone.replace(/\D/g, '')
  // Return several variants to match DB
  const variants = [phone]
  if (!phone.startsWith('+')) variants.push('+' + digits)
  variants.push(digits)
  return variants
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

    const variants = normalizePhone(phone)

    const staff = await prisma.staff.findFirst({
      where: { phone: { in: variants }, isActive: true },
      select: { id: true, name: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ name: staff.name })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
