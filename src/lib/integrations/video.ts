import { randomBytes } from "node:crypto";

/**
 * MOCK video-call provider using public Jitsi rooms (no API key needed).
 * Swap for Zoom / Google Meet API calls later; keep the return type.
 */
export async function createMeetingLink(): Promise<string> {
  return `https://meet.jit.si/clinic-${randomBytes(6).toString("hex")}`;
}
