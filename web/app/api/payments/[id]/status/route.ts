import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { refreshPayment } from "@/lib/payments/service";
import { verifySimulatorToken } from "@/lib/payments/simulator";

export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const s = await getSession();
    const token = new URL(req.url).searchParams.get("t");
    const p0 = await prisma.payment.findUnique({ where: { id }, include: { loan: true } });
    const allowed = p0 && (s?.role === "admin" || (s && p0.loan.userId === s.id) || verifySimulatorToken(id, token, process.env.SIMULATOR_SECRET || ""));
    if (!p0 || !allowed) return json({ error: "Not found" }, 404);
    const p = await refreshPayment(id);
    const r = await prisma.repaymentReceipt.findUnique({ where: { loanId_periodIndex: { loanId: p0.loanId, periodIndex: p0.periodIndex } } });
    return json({
      id: p!.id,
      status: p!.status,
      expiresAt: p!.expiresAt,
      paidAt: p!.paidAt,
      receipt: p!.status === "paid" && r ? { receiptHash: r.receiptHash, txHash: r.txHash, recording: !r.txHash && !r.error, error: r.error && r.error !== "in_flight" ? r.error : null } : null,
    });
  } catch (e) {
    return handleError(e);
  }
}
