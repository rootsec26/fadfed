"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { getI18n, LANG_COOKIE } from "@/lib/i18n";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string } | undefined;

export async function setLanguage(formData: FormData) {
  const lang = formData.get("lang") === "en" ? "en" : "ar";
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/** Only allow same-site relative redirects (rejects "//host" and "/\host" tricks). */
function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : null;
}

// Burn one scrypt verification for unknown emails so login response times
// don't reveal whether an account exists (user enumeration via timing).
const DUMMY_HASH =
  "00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  // Brute-force protection: 10 attempts / 10 min per IP+email, plus a looser
  // per-IP ceiling so rotating emails can't bypass it. Keying by email too
  // means one user's failed logins never block a different account on the
  // same IP (e.g. everyone on localhost shares the "local" bucket).
  const ip = await clientKey("login");
  if (!rateLimit(`login:${ip}:${email}`, 10, 10 * 60 * 1000) || !rateLimit(`login-ip:${ip}`, 60, 10 * 60 * 1000)) {
    return { error: t.auth.rateLimited };
  }
  const password = String(formData.get("password") ?? "");

  let role: string | undefined;
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) return { error: t.auth.invalid };

    await createSession(user.id);
    role = user.role;
  } catch (e) {
    // Never log the password. Surface a friendly message instead of a 500.
    console.error("[auth] login failed:", e instanceof Error ? e.message : e);
    return { error: t.auth.error };
  }
  redirect(safeNext(formData.get("next")) ?? (role === "doctor" ? "/dashboard" : "/account"));
}

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(200),
});

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { t } = await getI18n();
  // Account-creation spam guard: 10 signups / hour per IP.
  if (!rateLimit(`signup:${await clientKey("signup")}`, 10, 60 * 60 * 1000)) {
    return { error: t.auth.rateLimited };
  }
  if (formData.get("consent") !== "on") return { error: t.auth.needConsent };

  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const weak = parsed.error.issues.some((i) => i.path[0] === "password");
    return { error: weak ? t.auth.weak : t.booking.errors.invalid };
  }
  const { name, email, phone, password } = parsed.data;

  try {
    const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists) return { error: t.auth.exists };

    const passwordHash = await hashPassword(password);
    // users + patients must be created atomically: if the patient insert
    // fails after the user insert, the account exists but signup reported
    // an error — and a retry then hits "email already registered".
    const user = await db.transaction(async (tx) => {
      const [u] = await tx
        .insert(users)
        .values({ name, email, phone: phone || null, passwordHash })
        .returning();
      // NOTE: guest bookings made with the same email are NOT auto-linked until
      // email verification exists (prevents account takeover of someone's history).
      await tx.insert(patients).values({ userId: u.id, fullName: name, email, phone: phone || null });
      return u;
    });

    await createSession(user.id);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: t.auth.exists };
    // Never log the password. Surface a friendly message instead of a 500.
    console.error("[auth] signup failed:", e instanceof Error ? e.message : e);
    return { error: t.auth.error };
  }
  redirect(safeNext(formData.get("next")) ?? "/account");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
