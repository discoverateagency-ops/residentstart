import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { Shell } from "@/components/Shell";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { refreshPayment, simulatorUrl } from "@/lib/payments/service";
import { METHOD_LABEL, groupVa } from "@/lib/payments/simulator";
import type { Method } from "@/lib/payments/types";
import { idr } from "@/lib/format";
import { PayStatus } from "./PayStatus";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pay installment (SIMULASI)" };

export default async function PayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const s = await getSession();
  if (!s) redirect(`/login?next=/pay/${paymentId}`);
  const p0 = await prisma.payment.findUnique({ where: { id: paymentId }, include: { loan: { include: { project: true } } } });
  if (!p0 || (s.role !== "admin" && p0.loan.userId !== s.id)) notFound();
  const p = (await refreshPayment(paymentId))!;
  const receipt = await prisma.repaymentReceipt.findUnique({ where: { loanId_periodIndex: { loanId: p.loanId, periodIndex: p.periodIndex } } });
  const qrSvg = p.qrPayload ? await QRCode.toString(p.qrPayload, { type: "svg", margin: 1, width: 240, color: { dark: "#1A1F1E", light: "#FFFFFF" } }) : null;
  const origin = process.env.APP_URL || "";
  const simLink = s.role === "admin" ? simulatorUrl(origin, p.id) : null;
  const tenor = p0.loan.tenorMonths ?? 0;

  return (
    <Shell footer={false}>
      <div className="container-rs py-6 max-w-xl">
        <div className="rounded-lg bg-[#FFF3CD] text-[#664D03] text-xs font-bold tracking-widest px-3 py-1 inline-block">MODE SIMULASI</div>
        <div className="mt-3"><Link href={s.role === "admin" ? "/admin?tab=payments" : "/buyer/schedule"} className="text-sm text-rs-green-700">‹ Back to schedule</Link></div>
        <p className="mt-3 text-sm text-rs-ink/70">Period {p.periodIndex} of {tenor} · {p0.loan.project.name}</p>
        <p className="text-[34px] md:text-[40px] font-semibold tabular text-rs-green-900 leading-tight">{idr(p.amountIdr)}</p>

        <div className="card mt-4">
          <p className="text-sm font-semibold">{METHOD_LABEL[p.method as Method]}</p>
          {p.vaNumber ? (
            <div className="mt-3">
              <p className="text-xs text-rs-ink/60">Virtual Account number</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="mono text-xl tracking-wide">{groupVa(p.vaNumber)}</span>
                <CopyButton text={p.vaNumber} />
                <span className="rounded-md bg-[#FFF3CD] text-[#664D03] text-[11px] font-bold px-2 py-0.5">SIMULASI</span>
              </div>
              <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">ATM</summary><p className="mt-1 text-rs-ink/70">Choose Transfer → Virtual Account, enter the number above, confirm the amount. (Demo — do not transfer.)</p></details>
              <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium">m-banking</summary><p className="mt-1 text-rs-ink/70">Open your bank app → Transfer → Virtual Account → paste the number → confirm. (Demo — do not transfer.)</p></details>
              <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium">internet banking</summary><p className="mt-1 text-rs-ink/70">Log in → Transfer → Virtual Account → enter the number → confirm. (Demo — do not transfer.)</p></details>
            </div>
          ) : qrSvg ? (
            <div className="mt-3 flex flex-col items-center">
              <div className="w-[240px] h-[240px]" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="Simulated QR code" />
              <span className="mt-2 rounded-md bg-[#FFF3CD] text-[#664D03] text-xs font-bold px-2 py-0.5">SIMULASI</span>
              <p className="mt-2 text-sm text-rs-ink/70 text-center">Scan with any phone camera (demo). It opens the simulator page, not a real payment.</p>
            </div>
          ) : null}
        </div>

        <PayStatus
          paymentId={p.id}
          initial={{ status: p.status, expiresAt: p.expiresAt.toISOString(), receipt: receipt && p.status === "paid" ? { receiptHash: receipt.receiptHash, txHash: receipt.txHash } : null }}
          amountLabel={idr(p.amountIdr)}
          periodIndex={p.periodIndex}
          method={METHOD_LABEL[p.method as Method]}
          loanId={p.loanId}
          isBuyer={s.role === "buyer"}
        />
        {simLink && <a href={simLink} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-rs-green-700 underline">Open simulator ↗</a>}
      </div>
    </Shell>
  );
}
