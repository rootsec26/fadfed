import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic edge check: bounce visitors without a session cookie away from
 * /dashboard before any rendering work happens.
 *
 * This is NOT the security boundary — every admin page and every server
 * action still calls requireDoctor() server-side. The cookie is only a
 * hint here because the proxy cannot query Postgres cheaply.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/session/:path*"],
};
