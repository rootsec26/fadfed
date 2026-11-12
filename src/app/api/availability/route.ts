import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSlotsForRange } from "@/lib/slots";

/** Public: GET /api/availability?duration=50[&exclude=<appointmentId>] → { "2025-01-01": ["10:00", ...] } */
const cachedSlots = unstable_cache(
  (durationMin: number, excludeAppointmentId?: string) =>
    getSlotsForRange({ durationMin, days: 30, excludeAppointmentId }),
  ["availability-slots"],
  // Short TTL: slot display may lag a fresh booking by up to 30s, but every
  // write path revalidates the "slots" tag and createBooking re-checks
  // availability server-side before inserting.
  { revalidate: 30, tags: ["slots"] },
);

export async function GET(req: NextRequest) {
  const duration = Number(req.nextUrl.searchParams.get("duration"));
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) {
    return NextResponse.json({ error: "invalid duration" }, { status: 400 });
  }
  const exclude = req.nextUrl.searchParams.get("exclude") ?? undefined;
  const uuid = /^[0-9a-f-]{36}$/i;
  const slots = await cachedSlots(duration, exclude && uuid.test(exclude) ? exclude : undefined);
  return NextResponse.json(slots, { headers: { "Cache-Control": "no-store" } });
}
