import "server-only";

/**
 * Daily.co REST API wrapper (free plan). Server-only: DAILY_API_KEY must
 * never be NEXT_PUBLIC_ and is never logged.
 *
 * All calls fail soft — return null instead of throwing — so the live
 * session feature degrades to the doctor's manual_link when Daily is not
 * configured or the API is unreachable.
 */

const API = "https://api.daily.co/v1";
const TIMEOUT_MS = 10_000;

export const isDailyConfigured = () => !!process.env.DAILY_API_KEY;

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!isDailyConfigured()) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      // Log status only — never the key or response body (may echo request data).
      console.error(`[daily] ${init?.method ?? "GET"} ${path} -> ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[daily] ${init?.method ?? "GET"} ${path} failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export type DailyRoom = { name: string; url: string };

/**
 * Private room: token required, max 2 participants, knocking/waiting room on
 * (the doctor admits the patient), recording off, auto-expires at `expiresAt`.
 */
export async function createRoom(name: string, expiresAt: Date): Promise<DailyRoom | null> {
  const room = await api<DailyRoom>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        max_participants: 2,
        enable_knocking: true,
        enable_prejoin_ui: true,
        enable_recording: "",
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
    }),
  });
  // Daily may return the room under `data` on some API versions.
  if (room && typeof room === "object" && "name" in room) return room;
  return null;
}

/** Look up an existing room's URL (rooms are created lazily, url isn't stored). */
export async function getRoom(name: string): Promise<DailyRoom | null> {
  return api<DailyRoom>(`/rooms/${encodeURIComponent(name)}`);
}

/** Short-lived meeting token. nbf/exp bound it to the session window. */
export async function createMeetingToken(opts: {
  roomName: string;
  isOwner: boolean;
  notBefore: Date;
  expiresAt: Date;
}): Promise<string | null> {
  const res = await api<{ token?: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: opts.roomName,
        is_owner: opts.isOwner,
        nbf: Math.floor(opts.notBefore.getTime() / 1000),
        exp: Math.floor(opts.expiresAt.getTime() / 1000),
      },
    }),
  });
  return res?.token ?? null;
}

export async function deleteRoom(name: string): Promise<boolean> {
  const res = await api<{ name?: string }>(`/rooms/${encodeURIComponent(name)}`, { method: "DELETE" });
  return res !== null;
}
