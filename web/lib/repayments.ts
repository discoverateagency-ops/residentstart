import "server-only";
import { prisma } from "./db";
import { getChainLoan } from "./near";

/** Investor-facing repayment summary for a project (DB + live vault reads). */
export async function repaymentSummary(projectId: string) {
  const loans = await prisma.loan.findMany({
    where: { projectId, mode: "installment" },
    include: { periods: { select: { status: true } } },
    orderBy: { createdAt: "asc" },
  });
  let totalPeriods = 0;
  let paidPeriods = 0;
  let remainingIdr = BigInt(0);
  const perLoan = [];
  for (const l of loans) {
    const paid = l.periods.filter((p) => p.status === "paid").length;
    totalPeriods += l.periods.length;
    paidPeriods += paid;
    let remaining = (l.totalIdr ?? BigInt(0)) - (l.monthlyIdr ?? BigInt(0)) * BigInt(paid);
    let chainPaid: number | null = null;
    if (l.onchainLoanId) {
      try {
        const c = await getChainLoan(l.onchainLoanId);
        if (c) {
          remaining = BigInt(c.remaining_idr);
          chainPaid = c.paid_periods;
        }
      } catch {
        /* RPC hiccup: use DB numbers */
      }
    }
    remainingIdr += remaining;
    perLoan.push({ id: l.id, onchainLoanId: l.onchainLoanId, createTx: l.createTx, status: l.status, tenorMonths: l.tenorMonths, paid, total: l.periods.length, chainPaid, remainingIdr: remaining.toString() });
  }
  const receipts = await prisma.repaymentReceipt.findMany({
    where: { loan: { projectId } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return {
    loanCount: loans.filter((l) => l.status === "active").length,
    loans: perLoan,
    totalPeriods,
    paidPeriods,
    remainingIdr: remainingIdr.toString(),
    receipts: receipts.map((r) => ({ periodIndex: r.periodIndex, amountIdr: r.amountIdr.toString(), receiptHash: r.receiptHash, txHash: r.txHash, loanId: r.loanId, createdAt: r.createdAt.toISOString() })),
  };
}
