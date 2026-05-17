import { requireAuth } from '@/lib/auth'
import LoyaltyStaffView from '@/components/staff/LoyaltyStaffView'

export const dynamic = 'force-dynamic'

export default async function StaffLoyaltyPage() {
  const session = await requireAuth()
  return <LoyaltyStaffView isAdmin={session.role === 'ADMIN'} />
}
