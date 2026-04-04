import { NextRequest, NextResponse } from 'next/server'

// Paths that require authentication
const PROTECTED_PATHS = ['/matrix', '/simulate', '/radar']
const AUTH_COOKIE = 'appSession'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip auth API routes and public paths
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Check if path is protected
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // Check for Auth0 session cookie
  const session = req.cookies.get(AUTH_COOKIE)
  if (!session) {
    const loginUrl = new URL('/api/auth/login', req.url)
    loginUrl.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
