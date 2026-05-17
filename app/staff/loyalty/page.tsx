import { requireAuth } from '@/lib/auth'
import LoyaltyStaffView from '@/components/staff/LoyaltyStaffView'

export const dynamic = 'force-dynamic'

export default async function StaffLoyaltyPage() {
  await requireAuth()
  return <LoyaltyStaffView />
}
