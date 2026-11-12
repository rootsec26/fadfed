import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site";

/**
 * Step 1 of Google OAuth. Active only when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set.
 * Authorised redirect URI to register in Google Cloud: {APP_URL}/api/auth/google/callback
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=google_off", req.url));
  }
  const origin = getSiteUrl() ?? req.nextUrl.origin;
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
