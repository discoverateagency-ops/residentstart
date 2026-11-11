// Rupiah payment simulator (docs/PRD.md Scope §4). Pure functions; no DB access here so they are unit-testable.
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Method, ChargeInput, Charge, PaymentProvider } from "./types";

export const BANK_CODE: Record<Exclude<Method, "qris">, string> = { va_bca: "1", va_bni: "2", va_mandiri: "3" };
export const METHOD_LABEL: Record<Method, string> = {
  va_bca: "Bank BCA (SIMULASI)",
  va_bni: "Bank BNI (SIMULASI)",
  va_mandiri: "Bank Mandiri (SIMULASI)",
  qris: "QRIS (SIMULASI)",
};
export const VA_TTL_MS = 24 * 60 * 60 * 1000;
export const QRIS_TTL_MS = 15 * 60 * 1000;

export function isMethod(m: unknown): m is Method {
  return m === "va_bca" || m === "va_bni" || m === "va_mandiri" || m === "qris";
}

/** "9999" + 1-digit bank code + 11 digits derived from the payment id (16 digits total). */
export function vaNumber(method: Exclude<Method, "qris">, paymentId: string): string {
  const h = createHash("sha256").update(paymentId).digest("hex");
  const digits = (BigInt("0x" + h.slice(0, 16)) % BigInt("100000000000")).toString().padStart(11, "0");
  return `9999${BANK_CODE[method]}${digits}`;
}

export function groupVa(va: string): string {
  return va.replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function qrPayload(paymentId: string, amountIdr: string | number | bigint, link?: string): string {
  return link ?? `RESIDENTSTART-SIM|${paymentId}|${amountIdr.toString()}`;
}

export function expiryFor(method: Method, from: Date = new Date()): Date {
  return new Date(from.getTime() + (method === "qris" ? QRIS_TTL_MS : VA_TTL_MS));
}

export function sign(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifySignature(rawBody: string, signature: string | null | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(sign(rawBody, secret), "hex");
  let got: Buffer;
  try {
    got = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

/** Token that lets a phone open /simulator/[id] without an admin session. */
export function simulatorToken(paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`sim|${paymentId}`).digest("hex").slice(0, 32);
}

export function verifySimulatorToken(paymentId: string, token: string | null | undefined, secret: string): boolean {
  if (!token) return false;
  const exp = Buffer.from(simulatorToken(paymentId, secret));
  const got = Buffer.from(token);
  return got.length === exp.length && timingSafeEqual(got, exp);
}

/** receipt_hash = sha256(loan_id|period_index|amount_idr|paid_at_iso) */
export function receiptHash(loanId: string, periodIndex: number, amountIdr: string | number | bigint, paidAtIso: string): string {
  return createHash("sha256").update(`${loanId}|${periodIndex}|${amountIdr.toString()}|${paidAtIso}`).digest("hex");
}

export const simulatorProvider: PaymentProvider = {
  name: "simulator",
  createCharge(input: ChargeInput): Charge {
    const expiresAt = expiryFor(input.method, input.now);
    if (input.method === "qris") {
      return { providerRef: `SIM-${input.paymentId}`, qrPayload: qrPayload(input.paymentId, input.amountIdr, input.qrLink), vaNumber: null, expiresAt };
    }
    return { providerRef: `SIM-${input.paymentId}`, vaNumber: vaNumber(input.method, input.paymentId), qrPayload: null, expiresAt };
  },
  verifyWebhook(rawBody, signature, secret) {
    return verifySignature(rawBody, signature, secret);
  },
};
