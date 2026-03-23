import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

export async function getSession() {
  const cookieStore = await cookies()
  const staffId = cookieStore.get('session')?.value
  if (!staffId) return null

  const staff = await prisma.staff.findUnique({
    where: { id: staffId, isActive: true },
    select: {
      id: true,
      name: true,
      role: true,
      avatar: true,
      canCreateAppointments: true,
      canSeeClientLastName: true,
      canSeeClientPhone: true,
    },
  })
  return staff
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.role !== 'ADMIN') throw new Error('Forbidden')
  return session
}

/** Returns full display name for a client based on permission */
export function clientDisplayName(
  firstName: string,
  lastName: string | null,
  canSeeLastName: boolean
): string {
  if (!lastName) return firstName
  return canSeeLastName ? `${firstName} ${lastName}` : firstName
}
