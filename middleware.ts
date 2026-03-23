import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/staff/login', '/book', '/api/auth/login', '/api/appointments', '/api/slots', '/api/services']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Тільки staff-маршрути захищаємо
  if (!pathname.startsWith('/staff')) return NextResponse.next()
  if (pathname === '/staff/login') return NextResponse.next()

  const session = req.cookies.get('session')?.value
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/staff/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/staff/:path*'],
}
