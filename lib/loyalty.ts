import * as bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const CARD_SIZE = 10 // stamps needed to redeem -50%

export type LoyaltyState = {
  clientId: string
  firstName: string
  cycleNumber: number
  cyclesRedeemed: number
  stamps: number
  target: number
  canRedeem: boolean
}

export function normalizePhone(input: string): string {
  return input
    .replace(/\s/g, '')
    .replace(/^380/, '+380')
    .replace(/^0/, '+380')
}

export async function getLoyaltyState(clientId: string): Promise<LoyaltyState | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, firstName: true, loyaltyCyclesRedeemed: true },
  })
  if (!client) return null

  const cycleNumber = client.loyaltyCyclesRedeemed + 1
  const stamps = await prisma.loyaltyStamp.count({
    where: { clientId: client.id, cycleNumber },
  })

  return {
    clientId: client.id,
    firstName: client.firstName,
    cycleNumber,
    cyclesRedeemed: client.loyaltyCyclesRedeemed,
    stamps,
    target: CARD_SIZE,
    canRedeem: stamps >= CARD_SIZE,
  }
}

// Returns matching active staff or null. Iterates because bcrypt hashes
// are not comparable directly; staff list is small (handful of masters).
export async function verifyStaffPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) return null
  const activeStaff = await prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true, name: true, pinHash: true, role: true },
  })
  for (const staff of activeStaff) {
    if (await bcrypt.compare(pin, staff.pinHash)) {
      return { id: staff.id, name: staff.name, role: staff.role }
    }
  }
  return null
}

// Idempotent for appointmentId: relies on the @unique constraint to prevent
// double-stamping if appointment.status transitions to DONE more than once.
export async function awardStamp(opts: {
  clientId: string
  staffId?: string | null
  source: 'manual' | 'auto_appointment'
  appointmentId?: string | null
}) {
  const state = await getLoyaltyState(opts.clientId)
  if (!state) throw new Error('Client not found')
  if (state.stamps >= CARD_SIZE) {
    return { state, awarded: false, reason: 'cycle_full' as const }
  }

  try {
    await prisma.loyaltyStamp.create({
      data: {
        clientId: opts.clientId,
        cycleNumber: state.cycleNumber,
        source: opts.source,
        staffId: opts.staffId ?? null,
        appointmentId: opts.appointmentId ?? null,
      },
    })
  } catch (e: unknown) {
    // Unique constraint on appointmentId means another concurrent transition
    // already awarded the stamp; treat as success and return current state.
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002') {
      const fresh = await getLoyaltyState(opts.clientId)
      return { state: fresh!, awarded: false, reason: 'duplicate' as const }
    }
    throw e
  }

  const fresh = await getLoyaltyState(opts.clientId)
  return { state: fresh!, awarded: true, reason: null }
}
