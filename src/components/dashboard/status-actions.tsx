import { setAppointmentStatus } from "@/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import type { AppointmentStatus } from "@/db/schema";

const LABELS: Record<string, { label: string; variant: "primary" | "outline" | "danger" | "ghost" }> = {
  confirmed: { label: "أكد", variant: "primary" },
  completed: { label: "خلصت", variant: "outline" },
  no_show: { label: "مارضاش", variant: "ghost" },
  cancelled: { label: "إلغاء", variant: "danger" },
  pending: { label: "رجّع مستني", variant: "ghost" },
};

/** Buttons for the status transitions that make sense from the current status. */
export function StatusActions({ id, status }: { id: string; status: AppointmentStatus }) {
  const next: string[] =
    status === "pending"
      ? ["confirmed", "cancelled"]
      : status === "confirmed"
        ? ["completed", "no_show", "cancelled"]
        : status === "cancelled"
          ? ["pending"]
          : [];
  return (
    <div className="flex flex-wrap gap-2">
      {next.map((s) => (
        <form key={s} action={setAppointmentStatus.bind(null, id, s as AppointmentStatus)}>
          <SubmitButton size="sm" variant={LABELS[s].variant}>{LABELS[s].label}</SubmitButton>
        </form>
      ))}
    </div>
  );
}
