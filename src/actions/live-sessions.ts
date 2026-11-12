"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { liveSessions, users } from "@/db/schema";
import { getCurrentUser, isAdminEmail, requireDoctor } from "@/lib/auth";
import { createMeetingToken, createRoom, deleteRoom, getRoom, isDailyConfigured } from "@/lib/daily";
import {
  canStartSession,
  isLiveJoinable,
  loadLiveSession,
  tokenWindow,
  type LiveSession,
} from "@/lib/live-sessions";
import { getSettings } from "@/lib/settings";
import { zonedDateTimeToUtc } from "@/lib/time";

/**
 * Live 1:1 therapy sessions. Every action re-checks auth server-side:
 * doctor actions require requireDoctor(); join re-verifies that the caller
 * IS the assigned patient (or the doctor) and that the session is LIVE.
 * Tokens are generated per call and never reused.
 */

const roomNameFor = (id: string) => `live-${id}`;

/** Create the Daily room lazily and persist its name. Returns room name or null. */
async function ensureRoom(s: LiveSession): Promise<string | null> {
  if (s.roomName) return s.roomName;
  if (!isDailyConfigured()) return null;
  const room = await createRoom(roomNameFor(s.id), tokenWindow(s).expiresAt);
  if (!room) return null;
  await db.update(liveSessions).set({ roomName: room.name }).where(eq(liveSessions.id, s.id));
  return room.name;
}

async function deleteRoomSafely(s: LiveSession) {
  if (!s.roomName || !isDailyConfigured()) return;
  const ok = await deleteRoom(s.roomName);
  if (!ok) console.error(`[live] failed to delete room ${s.roomName} for session ${s.id}`);
}

const refreshAll = (id: string) => {
  revalidatePath("/dashboard/patients");
  revalidatePath("/account/sessions");
  revalidatePath(`/session/${id}`);
};

/* ───────────── Doctor ───────────── */

export type CreateLiveResult = { ok: true } | { ok: false; error: "invalid" | "email_not_found" };

const createSchema = z.object({
  /** Registered patient's email — looked up server-side, never trusted from the client. */
  email: z.string().trim().toLowerCase().email(),
  /** datetime-local value: "YYYY-MM-DDTHH:MM" in the clinic timezone. */
  dateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  manualLink: z.string().trim().url().optional().or(z.literal("")),
});

export async function createLiveSession(input: {
  email: string;
  dateTime: string;
  durationMinutes: number;
  manualLink?: string;
}): Promise<CreateLiveResult> {
  await requireDoctor();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const d = parsed.data;

  // Only a registered patient account can own a live session.
  const [patient] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, d.email))
    .limit(1);
  if (!patient || patient.role !== "patient") return { ok: false, error: "email_not_found" };

  const settings = await getSettings();
  const scheduledAt = zonedDateTimeToUtc(d.dateTime.slice(0, 10), d.dateTime.slice(11, 16), settings.timezone);
  if (Number.isNaN(scheduledAt.getTime())) return { ok: false, error: "invalid" };

  await db.insert(liveSessions).values({
    patientId: patient.id,
    scheduledAt,
    durationMinutes: d.durationMinutes,
    manualLink: d.manualLink || null,
  });
  revalidatePath("/dashboard/patients");
  revalidatePath("/account/sessions");
  return { ok: true };
}

/**
 * Doctor presses Start: guard the sane window, create the Daily room,
 * flip status to LIVE, then land the doctor in /session/[id] as owner.
 */
export async function startLiveSession(id: string) {
  await requireDoctor();
  const s = await loadLiveSession(id);
  if (!s || s.status !== "scheduled" || !canStartSession(s)) {
    redirect("/dashboard/patients?tab=sessions");
  }
  await ensureRoom(s);
  await db.update(liveSessions).set({ status: "live" }).where(eq(liveSessions.id, id));
  refreshAll(id);
  redirect(`/session/${id}`);
}

export async function endLiveSession(id: string): Promise<{ ok: boolean }> {
  await requireDoctor();
  const s = await loadLiveSession(id);
  if (!s) return { ok: false };
  await db.update(liveSessions).set({ status: "ended" }).where(eq(liveSessions.id, id));
  await deleteRoomSafely(s);
  refreshAll(id);
  return { ok: true };
}

export async function cancelLiveSession(id: string): Promise<{ ok: boolean }> {
  await requireDoctor();
  const s = await loadLiveSession(id);
  if (!s) return { ok: false };
  await db.update(liveSessions).set({ status: "cancelled" }).where(eq(liveSessions.id, id));
  await deleteRoomSafely(s);
  refreshAll(id);
  return { ok: true };
}

/* ───────────── Join (doctor or the assigned patient only) ───────────── */

export type JoinResult =
  | { ok: true; mode: "daily"; url: string; token: string; isOwner: boolean }
  | { ok: true; mode: "manual"; url: string }
  | { ok: false; error: string };

export async function joinLiveSession(id: string): Promise<JoinResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };

  const s = await loadLiveSession(id);
  if (!s) return { ok: false, error: "not_found" };

  // Only the assigned patient or the doctor may join — checked against the
  // session's patient_id (auth user id), never a client-supplied value.
  const isDoctor = user.role === "doctor" && isAdminEmail(user.email);
  const isPatient = user.id === s.patientId;
  if (!isDoctor && !isPatient) return { ok: false, error: "denied" };

  if (s.status === "cancelled") return { ok: false, error: "cancelled" };
  if (s.status === "ended") return { ok: false, error: "ended" };
  if (s.status === "scheduled") return { ok: false, error: "not_live" };
  if (!isLiveJoinable(s)) return { ok: false, error: "closed" };

  // Patient consent is recorded once, before first join.
  if (isPatient && !s.patientConsentAt) {
    await db
      .update(liveSessions)
      .set({ patientConsentAt: new Date() })
      .where(eq(liveSessions.id, s.id));
  }

  const roomName = await ensureRoom(s);
  if (roomName) {
    const room = await getRoom(roomName);
    const token = await createMeetingToken({
      roomName,
      isOwner: isDoctor,
      ...tokenWindow(s),
    });
    if (room?.url && token) {
      return { ok: true, mode: "daily", url: room.url, token, isOwner: isDoctor };
    }
  }

  // Daily not configured or failed → manual link fallback.
  if (s.manualLink) return { ok: true, mode: "manual", url: s.manualLink };
  return { ok: false, error: "unavailable" };
}
