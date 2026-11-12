/**
 * MOCK payments. No money moves in v1: appointments are stored with
 * paymentStatus = "unpaid" and the patient pays at the clinic.
 * Plug in Stripe / Moyasar / PayTabs here and return a checkout URL.
 */
export async function createPaymentSession(_appointmentId: string, _amount: number) {
  return { provider: "mock", status: "unpaid" as const, checkoutUrl: null as string | null };
}
