import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { adminAccountId, callVault, nearErrorMessage } from "@/lib/near";
import { getMainProject, pricingInput, tenors } from "@/lib/project";
import { cashPrice, pricingRow } from "@/lib/pricing";

export const maxDuration = 60;

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  const day = x.getUTCDate();
  x.setUTCMonth(x.getUTCMonth() + n);
  if (x.getUTCDate() < day) x.setUTCDate(0); // clamp to month end
  return x;
}

export async function POST(req: Request) {
  try {
    const user = await requireRole("buyer");
    const { mode, tenorYears } = (await req.json()) as { mode?: string; tenorYears?: number };
    if (mode !== "cash" && mode !== "installment") return json({ error: "Choose cash or installment" }, 400);
    const project = await getMainProject();
    if (!project) return json({ error: "No project" }, 404);

    const verified = await prisma.verification.findFirst({ where: { userId: user.id, verified: true } });
    if (!verified) return json({ error: "Verify your identity first" }, 403);
    const active = await prisma.loan.findFirst({ where: { userId: user.id, status: "active" } });
    if (active) return json({ error: "You already have an active purchase. One active loan per buyer." }, 409);

    const now = new Date();
    if (mode === "cash") {
      const loan = await prisma.loan.create({
        data: { userId: user.id, projectId: project.id, mode: "cash", totalIdr: BigInt(cashPrice(pricingInput(project))), startDate: now, status: "active" },
      });
      return json({ ok: true, loan });
    }

    const t = Number(tenorYears);
    if (!tenors(project).includes(t)) return json({ error: `Available tenors: ${tenors(project).join(", ")} years` }, 400);
    const row = pricingRow(pricingInput(project), t);
    const months = t * 12;

    // reserve the DB row first (its id is the on-chain loan id / borrower_ref, never the buyer's name or email)
    const loan = await prisma.loan.create({
      data: {
        userId: user.id,
        projectId: project.id,
        mode: "installment",
        tenorMonths: months,
        downPaymentIdr: BigInt(row.down_payment_idr),
        principalIdr: BigInt(row.principal_idr),
        monthlyIdr: BigInt(row.monthly_idr),
        totalIdr: BigInt(row.total_idr),
        startDate: now,
        status: "active",
      },
    });
    let res;
    try {
      res = await callVault(
        "create_loan",
        {
          loan_id: loan.id,
          project_id: project.onchainProjectId ?? project.slug,
          borrower_ref: loan.id,
          principal_idr: String(row.principal_idr),
          tenor_months: months,
          monthly_idr: String(row.monthly_idr),
          start_ts: now.getTime() * 1_000_000,
        },
        { signer: adminAccountId() },
      );
    } catch (e) {
      await prisma.loan.delete({ where: { id: loan.id } });
      return json({ error: `Transaction failed: ${nearErrorMessage(e)}` }, 400);
    }
    await prisma.$transaction([
      prisma.loan.update({ where: { id: loan.id }, data: { onchainLoanId: loan.id, createTx: res.txHash } }),
      prisma.schedulePeriod.createMany({
        data: Array.from({ length: months }, (_, i) => ({ loanId: loan.id, periodIndex: i + 1, dueDate: addMonths(now, i + 1), amountIdr: BigInt(row.monthly_idr), status: "due" })),
      }),
    ]);
    return json({ ok: true, loanId: loan.id, txHash: res.txHash, nearblocksUrl: res.nearblocksUrl });
  } catch (e) {
    return handleError(e);
  }
}
