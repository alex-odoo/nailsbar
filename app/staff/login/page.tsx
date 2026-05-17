import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import LoginForm from './LoginForm'

// Server wrapper: if the visitor already has a valid session cookie, send
// them straight to the dashboard. Without this, /staff/login renders for
// already-logged-in users and the parent layout shows the nav, which looks
// like an auth bypass even though the cookie is genuine.
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect('/staff/dashboard')
  return <LoginForm />
}
