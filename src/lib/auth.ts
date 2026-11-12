import "server-only";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { patients, sessions, users } from "@/db/schema";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const COOKIE = "session";
const SESSION_DAYS = 14;

/* ───────── passwords ───────── */

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

/* ───────── sessions ───────── */

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ id: sha(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha(token)));
  jar.delete(COOKIE);
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const [row] = await db
      .select({ id: users.id, email: users.email, name: users.name, phone: users.phone, role: users.role })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, sha(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return row ?? null;
  } catch (err) {
    // A failed session lookup must not take down public pages — the header
    // calls this on every page. Protected routes still redirect to /login.
    console.error("[auth] getCurrentUser failed:", err);
    return null;
  }
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/* ───────── role guards (call these in every protected page + action) ───────── */

/**
 * MVP lockdown: the doctor dashboard is restricted to a single allow-listed
 * email (default mvp-example@gmail.com, override with ADMIN_EMAILS as a
 * comma-separated list). Applies in EVERY environment — dev included — so
 * nobody else can open /admin even on localhost. The account itself still
 * needs a valid session (login), and every admin action re-checks this.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "mvp-example@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireDoctor(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "doctor" || !isAdminEmail(user.email)) redirect("/");
  return user;
}

/** The patient record that belongs to the logged-in patient (created on demand). */
export async function requirePatient() {
  const user = await requireUser();
  if (user.role === "doctor") redirect("/dashboard");
  return getOrCreatePatientForUser(user);
}

export async function getOrCreatePatientForUser(user: CurrentUser) {
  const [existing] = await db.select().from(patients).where(eq(patients.userId, user.id)).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(patients)
    .values({ userId: user.id, fullName: user.name, email: user.email, phone: user.phone })
    .returning();
  return created;
}
