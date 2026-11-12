import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { liveSessions, type LiveSessionStatus } from "@/db/schema";

export type LiveSession = typeof liveSessions.$inferSelect;

/**
 * Live sessions are gated by STATUS, not the clock:
 *  - SCHEDULED → patient waits, doctor presses Start
 *  - LIVE      → both may join (patient after consent, doctor as owner)
 *  - ENDED / CANCELLED → never joinable
 *
 * Sanity bounds only: a session may be started from 2h before its scheduled
 * time until 24h after it, and a LIVE session stops being joinable 24h
 * after its scheduled time.
 */
export const START_EARLY_MS = 2 * 3600_000;
export const HARD_CLOSE_MS = 24 * 3600_000;

export const sessionEnd = (s: Pick<LiveSession, "scheduledAt" | "durationMinutes">) =>
  new Date(s.scheduledAt.getTime() + s.durationMinutes * 60_000);

export const startWindowOpensAt = (s: Pick<LiveSession, "scheduledAt">) =>
  new Date(s.scheduledAt.getTime() - START_EARLY_MS);

export const joinHardCloseAt = (s: Pick<LiveSession, "scheduledAt">) =>
  new Date(s.scheduledAt.getTime() + HARD_CLOSE_MS);

/** Doctor may press Start only inside [scheduledAt-2h, scheduledAt+24h]. */
export function canStartSession(s: Pick<LiveSession, "scheduledAt">, now = new Date()) {
  return now >= startWindowOpensAt(s) && now <= joinHardCloseAt(s);
}

/** A LIVE session can be joined until the hard close. */
export function isLiveJoinable(s: LiveSession, now = new Date()) {
  return s.status === "live" && now < joinHardCloseAt(s);
}

/** Token validity window: from earliest possible start until hard close. */
export function tokenWindow(s: LiveSession) {
  return { notBefore: startWindowOpensAt(s), expiresAt: joinHardCloseAt(s) };
}

export const JOINABLE_FOR_PATIENT: LiveSessionStatus[] = ["live"];

export async function loadLiveSession(id: string) {
  const [row] = await db.select().from(liveSessions).where(eq(liveSessions.id, id)).limit(1);
  return row ?? null;
}
