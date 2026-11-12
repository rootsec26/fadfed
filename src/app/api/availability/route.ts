import { NextRequest, NextResponse } from "next/server";
import { getSlotsForRange } from "@/lib/slots";

/** Public: GET /api/availability?duration=50[&exclude=<appointmentId>] → { "2025-01-01": ["10:00", ...] } */
export async function GET(req: NextRequest) {
  const duration = Number(req.nextUrl.searchParams.get("duration"));
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) {
    return NextResponse.json({ error: "invalid duration" }, { status: 400 });
  }
  const exclude = req.nextUrl.searchParams.get("exclude") ?? undefined;
  const uuid = /^[0-9a-f-]{36}$/i;
  const slots = await getSlotsForRange({
    durationMin: duration,
    days: 30,
    excludeAppointmentId: exclude && uuid.test(exclude) ? exclude : undefined,
  });
  return NextResponse.json(slots, { headers: { "Cache-Control": "no-store" } });
}
