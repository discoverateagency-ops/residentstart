export type Method = "va_bca" | "va_bni" | "va_mandiri" | "qris";
export type PaymentStatus = "pending" | "paid" | "expired" | "failed";

export type ChargeInput = { paymentId: string; method: Method; amountIdr: bigint | number | string; now?: Date; qrLink?: string };
export type Charge = { providerRef: string; vaNumber: string | null; qrPayload: string | null; expiresAt: Date };

export type WebhookEvent = {
  event_id: string;
  payment_id: string;
  type: "payment.paid" | "payment.failed" | "payment.expired";
  amount_idr: string;
  occurred_at: string;
};

/** Replaceable by a real gateway (VA + QRIS) later. */
export interface PaymentProvider {
  name: string;
  createCharge(input: ChargeInput): Charge;
  verifyWebhook(rawBody: string, signature: string | null, secret: string): boolean;
}
