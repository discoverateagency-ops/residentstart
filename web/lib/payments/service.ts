import "server-only";
import { randomUUID } from "crypto";
import { prisma } from "../db";
import { callVault, adminAccountId, nearErrorMessage } from "../near";
import { HttpError } from "../session";
import { receiptHash, simulatorProvider, simulatorToken, sign, verifySignature } from "./simulator";
import type { Method, WebhookEvent } from "./types";

const secret = () => {
  const s = process.env.SIMULATOR_SECRET;
  if (!s) throw new Error("SIMULATOR_SECRET is not configured");
  return s;
};

export function simulatorUrl(origin: string, paymentId: string) {
  return `${origin}/simulator/${paymentId}?t=${simulatorToken(paymentId, secret())}`;
}

/** POST /api/payments — one pending payment per period; idempotent per buyer+period for 60 s. */
export async function createPayment(opts: { userId: string; loanId: string; periodIndex: number; method: Method; origin: string }) {
  const loan = await prisma.loan.findUnique({ where: { id: opts.loanId } });
  if (!loan || loan.userId !== opts.userId) throw new HttpError(404, "Loan not found");
  if (loan.mode !== "installment" || loan.status !== "active") throw new HttpError(400, "Loan is not an active installment");
  const period = await prisma.schedulePeriod.findUnique({ where: { loanId_periodIndex: { loanId: loan.id, periodIndex: opts.periodIndex } } });
  if (!period) throw new HttpError(404, "Period not found");
  if (period.status === "paid") throw new HttpError(409, "This period is already paid");
  const firstUnpaid = await prisma.schedulePeriod.findFirst({ where: { loanId: loan.id, status: "due" }, orderBy: { periodIndex: "asc" } });
  if (!firstUnpaid || firstUnpaid.periodIndex !== period.periodIndex) throw new HttpError(400, "Only the next unpaid period can be paid");

  await expireStale(loan.id, period.periodIndex);
  const pending = await prisma.payment.findFirst({ where: { loanId: loan.id, periodIndex: period.periodIndex, status: "pending" } });
  if (pending) return pending; // one pending payment per period (also covers double-click)

  // concurrent requests (double-click) compute the same key → one row; after an expiry/failure the attempt count moves on
  const bucket = Math.floor(Date.now() / 60000);
  const attempts = await prisma.payment.count({ where: { loanId: loan.id, periodIndex: period.periodIndex } });
  const idempotencyKey = `${opts.userId}:${loan.id}:${period.periodIndex}:${bucket}:${attempts}`;
  const id = randomUUID().replace(/-/g, "").slice(0, 24);
  const qrLink = process.env.SIMULATOR_QR_LINK === "false" ? undefined : simulatorUrl(opts.origin, `p_${id}`);
  const charge = simulatorProvider.createCharge({ paymentId: `p_${id}`, method: opts.method, amountIdr: period.amountIdr, qrLink });
  try {
    return await prisma.payment.create({
      data: {
        id: `p_${id}`,
        loanId: loan.id,
        periodIndex: period.periodIndex,
        method: opts.method,
        provider: simulatorProvider.name,
        providerRef: charge.providerRef,
        vaNumber: charge.vaNumber,
        qrPayload: charge.qrPayload,
        amountIdr: period.amountIdr, // never from the client
        status: "pending",
        expiresAt: charge.expiresAt,
        idempotencyKey,
      },
    });
  } catch {
    // unique idempotency key hit by a concurrent request: return the existing one
    const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing && existing.status === "pending") return existing;
    throw new HttpError(409, "Payment already being created");
  }
}

async function expireStale(loanId: string, periodIndex: number) {
  await prisma.payment.updateMany({
    where: { loanId, periodIndex, status: "pending", expiresAt: { lt: new Date() } },
    data: { status: "expired" },
  });
}

/** Lazy expiry + receipt retry, called from the status poll. */
export async function refreshPayment(paymentId: string) {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) return null;
  if (p.status === "pending" && p.expiresAt < new Date()) {
    await prisma.payment.updateMany({ where: { id: p.id, status: "pending" }, data: { status: "expired" } });
  }
  if (p.status === "paid") {
    const r = await prisma.repaymentReceipt.findUnique({ where: { loanId_periodIndex: { loanId: p.loanId, periodIndex: p.periodIndex } } });
    // retry only when the webhook's own attempt is clearly finished (failed, or stuck > 30 s)
    if (r && !r.txHash && (r.error || Date.now() - r.createdAt.getTime() > 30_000)) {
      await recordReceiptOnChain(r.id);
    }
  }
  return prisma.payment.findUnique({ where: { id: paymentId } });
}

/** Signs vault.record_repayment with the admin key; idempotent per receipt. */
export async function recordReceiptOnChain(receiptId: string) {
  const r = await prisma.repaymentReceipt.findUnique({ where: { id: receiptId }, include: { loan: true } });
  if (!r || r.txHash) return r;
  if (!r.loan.onchainLoanId) {
    return prisma.repaymentReceipt.update({ where: { id: r.id }, data: { error: "Loan has no on-chain id" } });
  }
  // claim the attempt so concurrent pollers don't double-send
  const claimed = await prisma.repaymentReceipt.updateMany({
    where: {
      id: r.id,
      txHash: null,
      OR: [{ error: null }, { error: { not: "in_flight" } }, { updatedAt: { lt: new Date(Date.now() - 60_000) } }],
    },
    data: { error: "in_flight" },
  });
  if (claimed.count === 0) return r;
  try {
    const res = await callVault(
      "record_repayment",
      { loan_id: r.loan.onchainLoanId, period_index: r.periodIndex, amount_idr: r.amountIdr.toString(), receipt_hash: r.receiptHash },
      { signer: adminAccountId() },
    );
    return prisma.repaymentReceipt.update({ where: { id: r.id }, data: { txHash: res.txHash, recordedAt: new Date(), error: null } });
  } catch (e) {
    const msg = nearErrorMessage(e);
    console.error("[receipt] record_repayment failed", msg);
    return prisma.repaymentReceipt.update({ where: { id: r.id }, data: { error: msg.slice(0, 500) } });
  }
}

export type WebhookResult = { status: number; body: Record<string, unknown> };

/** POST /api/payments/webhook core. */
export async function handleWebhook(rawBody: string, signature: string | null): Promise<WebhookResult> {
  const valid = verifySignature(rawBody, signature, secret());
  let evt: WebhookEvent | null = null;
  try {
    evt = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    evt = null;
  }
  if (!valid) {
    await prisma.paymentEvent.create({
      data: { paymentId: null, eventId: evt?.event_id ?? null, type: evt?.type ?? "unknown", payload: (evt ?? { raw: rawBody.slice(0, 500) }) as object, signatureValid: false, note: "invalid_signature" },
    });
    return { status: 401, body: { error: "Invalid signature" } };
  }
  if (!evt || !evt.event_id || !evt.payment_id || !evt.type) return { status: 400, body: { error: "Malformed event" } };

  const payment = await prisma.payment.findUnique({ where: { id: evt.payment_id } });
  const paymentId = payment?.id ?? null;

  const seen = await prisma.paymentEvent.findFirst({ where: { eventId: evt.event_id, signatureValid: true, duplicate: false } });
  if (seen) {
    await prisma.paymentEvent.create({ data: { paymentId, eventId: evt.event_id, type: evt.type, payload: evt as object, signatureValid: true, duplicate: true, note: "duplicate" } });
    return { status: 200, body: { ok: true, duplicate: true } };
  }
  if (!payment) {
    await prisma.paymentEvent.create({ data: { paymentId: null, eventId: evt.event_id, type: evt.type, payload: evt as object, signatureValid: true, note: "unknown_payment" } });
    return { status: 404, body: { error: "Payment not found" } };
  }
  if (String(evt.amount_idr) !== payment.amountIdr.toString()) {
    await prisma.paymentEvent.create({ data: { paymentId, eventId: evt.event_id, type: evt.type, payload: evt as object, signatureValid: true, note: "amount_mismatch" } });
    return { status: 400, body: { error: "Amount does not match the payment" } };
  }
  await prisma.paymentEvent.create({ data: { paymentId, eventId: evt.event_id, type: evt.type, payload: evt as object, signatureValid: true } });

  if (evt.type === "payment.failed" || evt.type === "payment.expired") {
    const status = evt.type === "payment.failed" ? "failed" : "expired";
    const u = await prisma.payment.updateMany({ where: { id: payment.id, status: "pending" }, data: { status } });
    return { status: 200, body: { ok: true, status: u.count ? status : payment.status } };
  }

  // payment.paid
  if (payment.status !== "pending") return { status: 200, body: { ok: true, status: payment.status, note: "not pending" } };
  const paidAt = new Date();
  const paidAtIso = paidAt.toISOString();
  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: payment.loanId } });
  const hash = receiptHash(loan.onchainLoanId ?? loan.id, payment.periodIndex, payment.amountIdr, paidAtIso);

  const receipt = await prisma.$transaction(async (tx) => {
    const u = await tx.payment.updateMany({ where: { id: payment.id, status: "pending" }, data: { status: "paid", paidAt } });
    if (u.count === 0) return null;
    await tx.schedulePeriod.update({
      where: { loanId_periodIndex: { loanId: payment.loanId, periodIndex: payment.periodIndex } },
      data: { status: "paid", paidAt },
    });
    const remaining = await tx.schedulePeriod.count({ where: { loanId: payment.loanId, status: "due" } });
    if (remaining === 0) await tx.loan.update({ where: { id: payment.loanId }, data: { status: "completed" } });
    return tx.repaymentReceipt.create({
      data: { loanId: payment.loanId, periodIndex: payment.periodIndex, amountIdr: payment.amountIdr, receiptHash: hash, paidAtIso },
    });
  });
  if (!receipt) return { status: 200, body: { ok: true, note: "already processed" } };

  const recorded = await recordReceiptOnChain(receipt.id);
  return { status: 200, body: { ok: true, status: "paid", receipt_hash: hash, tx_hash: recorded?.txHash ?? null } };
}

/** Builds and signs a simulator event, then POSTs it to the webhook like a bank would. */
export async function sendSimulatorEvent(origin: string, paymentId: string, action: "pay" | "fail" | "expire") {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) throw new HttpError(404, "Payment not found");
  const type = action === "pay" ? "payment.paid" : action === "fail" ? "payment.failed" : "payment.expired";
  const evt: WebhookEvent = { event_id: `evt_${randomUUID()}`, payment_id: p.id, type, amount_idr: p.amountIdr.toString(), occurred_at: new Date().toISOString() };
  const raw = JSON.stringify(evt);
  const res = await fetch(`${origin}/api/payments/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-simulator-signature": sign(raw, secret()) },
    body: raw,
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { httpStatus: res.status, body, event: evt };
}
