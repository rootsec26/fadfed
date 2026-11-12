import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";

/** Step 2 of Google OAuth: exchange the code, find-or-create the user, start a session. */
export async function GET(req: NextRequest) {
  const fail = () => NextResponse.redirect(new URL("/login?error=google_fail", req.url));
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || state !== req.cookies.get("oauth_state")?.value) return fail();

  const origin = getSiteUrl() ?? req.nextUrl.origin;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail();
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return fail();
  const info = (await infoRes.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
  if (!info.email || !info.email_verified) return fail();
  const email = info.email.toLowerCase();

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, name: info.name ?? email, googleId: info.sub })
      .returning();
    await db.insert(patients).values({ userId: user.id, fullName: user.name, email });
  } else if (!user.googleId) {
    // Google verified this email, so it is safe to link to the existing account.
    await db.update(users).set({ googleId: info.sub }).where(eq(users.id, user.id));
  }

  await createSession(user.id);
  const res = NextResponse.redirect(new URL(user.role === "doctor" ? "/dashboard" : "/account", req.url));
  res.cookies.delete("oauth_state");
  return res;
}
