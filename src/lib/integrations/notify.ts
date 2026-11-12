import { db } from "@/db";
import { notificationLog } from "@/db/schema";

/**
 * MOCK notification providers.
 * Replace the bodies of `sendEmail` / `sendWhatsApp` with real providers
 * (Resend, SendGrid, WhatsApp Cloud API, Twilio…). Call sites stay unchanged.
 * For now messages are written to the `notification_log` table (visible in
 * Admin → Settings) and to the server console.
 */

export async function sendEmail(to: string, subject: string, body: string) {
  console.log(`[mock-email] to=${to} subject=${subject}`);
  await db.insert(notificationLog).values({ channel: "email", recipient: to, subject, body });
}

export async function sendWhatsApp(to: string, body: string) {
  console.log(`[mock-whatsapp] to=${to}`);
  await db.insert(notificationLog).values({ channel: "whatsapp", recipient: to, body });
}
