import { redirect } from 'next/navigation'

// Short alias for /staff/login so the admin/master can use a simpler URL.
export default function AdminPage(): never {
  redirect('/staff/login')
}
