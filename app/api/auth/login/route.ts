import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()
    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 })
    }

    // Перебираємо всіх активних staff (їх лише 2)
    const staffList = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, pinHash: true, role: true },
    })

    let matched = null
    for (const s of staffList) {
      if (await verifyPin(pin, s.pinHash)) {
        matched = s
        break
      }
    }

    if (!matched) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set('session', matched.id, {
      httpOnly: true,
      secure: process.env.HTTPS === 'true',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 днів
      path: '/',
    })

    return NextResponse.json({ ok: true, role: matched.role })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
