import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { recordReceiptOnChain } from "@/lib/payments/service";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const { paymentId } = (await req.json()) as { paymentId?: string };
    const p = paymentId ? await prisma.payment.findUnique({ where: { id: paymentId } }) : null;
    if (!p || p.status !== "paid") return json({ error: "Only paid payments have receipts" }, 400);
    const r = await prisma.repaymentReceipt.findUnique({ where: { loanId_periodIndex: { loanId: p.loanId, periodIndex: p.periodIndex } } });
    if (!r) return json({ error: "Receipt not found" }, 404);
    if (r.txHash) return json({ ok: true, txHash: r.txHash });
    // allow an immediate admin retry even if a previous attempt is marked in flight
    await prisma.repaymentReceipt.update({ where: { id: r.id }, data: { error: "admin_retry" } });
    const out = await recordReceiptOnChain(r.id);
    if (!out?.txHash) return json({ error: out?.error || "Recording failed" }, 502);
    return json({ ok: true, txHash: out.txHash });
  } catch (e) {
    return handleError(e);
  }
}
