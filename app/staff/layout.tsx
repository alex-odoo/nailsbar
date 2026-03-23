import StaffNav from '@/components/staff/StaffNav'
import { getSession } from '@/lib/auth'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  // login page — без навігації
  const session = await getSession()
  if (!session) return <>{children}</>

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <main className="flex-1 pb-20 pt-safe overflow-y-auto">{children}</main>
      <StaffNav role={session.role} />
    </div>
  )
}
