import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes — always allow
  const publicRoutes = ['/', '/login', '/onboarding', '/ref', '/admin']
  if (publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next()
  }

  // API routes — allow auth + cron routes (cron uses its own CRON_SECRET check), protect the rest
  if (pathname.startsWith('/api/auth')) return NextResponse.next()
  if (pathname.startsWith('/api/cron/')) return NextResponse.next()
  if (pathname.startsWith('/api/') && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Not logged in — redirect to login
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logged in but onboarding not complete — redirect to onboarding
  const onboardingStep = (session.user as { onboardingStep?: number }).onboardingStep ?? 0
  if (onboardingStep < 5 && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
