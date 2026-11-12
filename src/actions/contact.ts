"use server";

import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { sendEmail } from "@/lib/integrations/notify";
import { getI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { doctorProfile } from "@/lib/profile";

export type ContactState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(5).max(3000),
});

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const { t } = await getI18n();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.contact.error };

  await db.insert(contactMessages).values({ ...parsed.data, phone: parsed.data.phone || null });
  const settings = await getSettings();
  if (settings.notifyDoctor) {
    await sendEmail(doctorProfile.email || settings.email, `رسالة جديدة من ${parsed.data.name}`, parsed.data.message);
  }
  return { ok: true };
}
