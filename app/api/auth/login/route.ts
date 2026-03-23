import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPin } from '@/lib/auth'

function normalizePhone(phone: string): string[] {
  const digits = phone.replace(/\D/g, '')
  const variants = [phone]
  if (!phone.startsWith('+')) variants.push('+' + digits)
  variants.push(digits)
  return variants
}

export async function POST(req: NextRequest) {
  try {
    const { phone, pin } = await req.json()
    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 })
    }

    let matched = null

    if (phone) {
      // Login by phone + PIN
      const variants = normalizePhone(phone)
      const staff = await prisma.staff.findFirst({
        where: { phone: { in: variants }, isActive: true },
        select: { id: true, pinHash: true, role: true },
      })
      if (staff && await verifyPin(pin, staff.pinHash)) {
        matched = staff
      }
    } else {
      // Fallback: iterate all active staff (only 2 people)
      const staffList = await prisma.staff.findMany({
        where: { isActive: true },
        select: { id: true, pinHash: true, role: true },
      })
      for (const s of staffList) {
        if (await verifyPin(pin, s.pinHash)) {
          matched = s
          break
        }
      }
    }

    if (!matched) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set('session', matched.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return NextResponse.json({ ok: true, role: matched.role })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
