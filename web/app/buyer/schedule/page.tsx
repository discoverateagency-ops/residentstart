import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { TxLink } from "@/components/TxLink";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { idr, dateId, shortHash } from "@/lib/format";
import { NEARBLOCKS } from "@/lib/nearblocks";
import { PayButton } from "./PayButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Installment schedule" };
const PER_PAGE = 24;

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login?next=/buyer/schedule");
  if (s.role !== "buyer") redirect("/");
  const loan = await prisma.loan.findFirst({ where: { userId: s.id, mode: "installment", status: { in: ["active", "completed"] } }, orderBy: { createdAt: "desc" }, include: { project: true } });
  if (!loan) {
    return (
      <Shell>
        <div className="container-rs py-10">
          <div className="card max-w-lg">
            <h1 className="text-2xl">No installment yet</h1>
            <p className="mt-2 text-rs-ink/70">Confirm an installment on your dashboard to get a schedule.</p>
            <Link href="/buyer" className="btn-primary mt-4">Go to dashboard</Link>
          </div>
        </div>
      </Shell>
    );
  }
  const periods = await prisma.schedulePeriod.findMany({ where: { loanId: loan.id }, orderBy: { periodIndex: "asc" } });
  const receipts = await prisma.repaymentReceipt.findMany({ where: { loanId: loan.id } });
  const rmap = new Map(receipts.map((r) => [r.periodIndex, r]));
  const paid = periods.filter((p) => p.status === "paid").length;
  const next = periods.find((p) => p.status === "due");
  const remaining = (loan.totalIdr ?? BigInt(0)) - (loan.monthlyIdr ?? BigInt(0)) * BigInt(paid);
  const pages = Math.max(1, Math.ceil(periods.length / PER_PAGE));
  const { page: pageQ } = await searchParams;
  const nextPage = next ? Math.ceil(next.periodIndex / PER_PAGE) : 1;
  const page = Math.min(pages, Math.max(1, Number(pageQ) || nextPage));
  const slice = periods.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const years = (loan.tenorMonths ?? 0) / 12;

  return (
    <Shell>
      <div className="container-rs py-8 pb-28 md:pb-8">
        <Link href="/buyer" className="text-sm text-rs-green-700">‹ Dashboard</Link>
        <h1 className="mt-2 text-xl md:text-2xl">Installment schedule · {years} years · {idr(loan.monthlyIdr ?? 0)} / month</h1>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm tabular">
          <Box k="Principal" v={idr(loan.principalIdr ?? 0)} />
          <Box k="Paid" v={`${paid} / ${periods.length}`} />
          <Box k="Remaining" v={idr(remaining)} />
          <div className="rounded-2xl bg-white border border-rs-border p-3"><div className="text-xs text-rs-ink/60">Loan on NEAR</div><TxLink hash={loan.createTx} label="create tx" /></div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-rs-ink/70">Page {page} of {pages}</p>
          {next && page !== nextPage && <Link href={`/buyer/schedule?page=${nextPage}`} className="btn-secondary btn-sm">Jump to next unpaid</Link>}
        </div>

        {/* desktop table */}
        <div className="hidden md:block card p-0 mt-3 overflow-hidden">
          <table className="w-full text-sm tabular">
            <thead className="bg-rs-bg text-left text-rs-ink/60"><tr><th className="px-4 py-3">#</th><th>Due date</th><th>Amount</th><th>Status</th><th className="pr-4">Action</th></tr></thead>
            <tbody>
              {slice.map((p) => {
                const r = rmap.get(p.periodIndex);
                return (
                  <tr key={p.id} className="border-t border-rs-border">
                    <td className="px-4 py-3">{p.periodIndex}</td>
                    <td>{dateId(p.dueDate)}</td>
                    <td>{idr(p.amountIdr)}</td>
                    <td><StatusPill status={p.status} /></td>
                    <td className="pr-4 py-2">
                      {p.status === "paid" ? <Receipt hash={r?.receiptHash} tx={r?.txHash} /> : next?.periodIndex === p.periodIndex ? <PayButton loanId={loan.id} periodIndex={p.periodIndex} /> : <span className="text-rs-ink/40">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="md:hidden mt-3 flex flex-col gap-2">
          {slice.map((p) => {
            const r = rmap.get(p.periodIndex);
            return (
              <div key={p.id} className="card p-4 flex flex-col gap-2 text-sm tabular">
                <div className="flex justify-between items-center"><span className="font-semibold">Period {p.periodIndex}</span><StatusPill status={p.status} /></div>
                <div className="flex justify-between"><span className="text-rs-ink/60">{dateId(p.dueDate)}</span><span>{idr(p.amountIdr)}</span></div>
                {p.status === "paid" && <Receipt hash={r?.receiptHash} tx={r?.txHash} />}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`/buyer/schedule?page=${n}`} className={`h-9 min-w-9 px-3 rounded-lg border text-sm flex items-center justify-center ${n === page ? "bg-rs-green-700 text-white border-rs-green-700" : "bg-white border-rs-border"}`}>{n}</Link>
          ))}
        </div>
      </div>

      {next && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-rs-border p-3 flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <span className="text-sm tabular">Next: period {next.periodIndex} · {idr(next.amountIdr)}</span>
          <PayButton loanId={loan.id} periodIndex={next.periodIndex} />
        </div>
      )}
    </Shell>
  );
}

function Box({ k, v }: { k: string; v: string }) {
  return <div className="rounded-2xl bg-white border border-rs-border p-3"><div className="text-xs text-rs-ink/60">{k}</div><div className="font-semibold text-rs-green-900">{v}</div></div>;
}

function Receipt({ hash, tx }: { hash?: string; tx?: string | null }) {
  if (!hash) return <span className="text-rs-ink/50">paid</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      <span className="mono" title={hash}>receipt {shortHash(hash)}</span>
      {tx ? <a className="mono text-rs-green-700 underline decoration-dotted" href={`${NEARBLOCKS}/txns/${tx}`} target="_blank" rel="noreferrer">tx ↗</a> : <span className="text-[#B54708]">recording…</span>}
    </span>
  );
}
