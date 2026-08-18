import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── i18n middleware ───────────────────────────────────────────────
const intlMiddleware = createIntlMiddleware(routing);

export default function middleware(request: NextRequest) {
  // 1. Handle locale routing first
  const response = intlMiddleware(request);

  // 2. Check auth for /app routes
  const { pathname } = request.nextUrl;

  // Extract locale from pathname
  const segments = pathname.split('/');
  const locale = segments[1]; // e.g., 'en' or 'ar'

  // Check if the path includes /app (after locale)
  const isAppRoute =
    (locale === 'en' || locale === 'ar') &&
    segments.length > 2 &&
    segments[2] === 'app';

  if (isAppRoute) {
    // Allow guest access via query param
    const isGuestAccess = request.nextUrl.searchParams.get('guest') === 'true';
    if (isGuestAccess) {
      // Set a guest cookie so subsequent requests are recognized
      response.cookies.set('medai_guest', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: 'lax',
      });
      return response;
    }

    // Check for NextAuth session token cookie
    const sessionToken =
      request.cookies.get('authjs.session-token')?.value ||
      request.cookies.get('__Secure-authjs.session-token')?.value;

    // Check for guest cookie
    const guestCookie = request.cookies.get('medai_guest')?.value;

    if (!sessionToken && !guestCookie) {
      // Redirect to login
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes (except auth)
  // - _next (Next.js internals)
  // - static files (images, etc.)
  matcher: ['/', '/(en|ar)/:path*'],
};
