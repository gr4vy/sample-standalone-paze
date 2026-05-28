import { NextResponse } from 'next/server';

// Paze treats `callbackURLScheme` as a URL scheme identifier and appends
// `:?<query>#<fragment>` to it verbatim, so the browser lands on
// `/paze/return:` instead of `/paze/return`. Route the colon-suffixed path
// back to the canonical page. A Next.js `rewrites()` config can't express
// this — path-to-regexp parses `:` as a parameter prefix — so we do it here.
export function proxy(request) {
  if (request.nextUrl.pathname === '/paze/return:') {
    const url = request.nextUrl.clone();
    url.pathname = '/paze/return';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/paze/:path*',
};
