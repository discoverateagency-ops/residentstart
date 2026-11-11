import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { TxLink, AccountLink } from "@/components/TxLink";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getMainProject } from "@/lib/project";
import { getChainProject, getChainProposal, type ChainProject } from "@/lib/near";
import { idr, dateTimeId } from "@/lib/format";
import { plain } from "@/lib/http";
import { DAO_CONTRACT, VAULT_CONTRACT } from "@/lib/nearblocks";
import { METHOD_LABEL } from "@/lib/payments/simulator";
import type { Method } from "@/lib/payments/types";
import { simulatorUrl } from "@/lib/payments/service";
import { ProjectForm, DaoActions, VerifyButton, RetryReceiptButton, DesignsAdmin, RoomsAdmin, MarketingAdmin } from "./AdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

const TABS = [
  ["project", "Project"],
  ["dao", "DAO"],
  ["buyers", "Buyers"],
  ["payments", "Payments"],
  ["designs", "Designs"],
  ["marketing", "Marketing"],
] as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; method?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login?next=/admin");
  if (s.role !== "admin") redirect("/");
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "project";
  const project = await getMainProject({ sync: tab === "dao" || tab === "project" });
  if (!project) return <Shell><div className="container-rs py-10">No project. Run npm run seed.</div></Shell>;

  return (
    <Shell>
      <div className="container-rs py-8">
        <h1 className="text-2xl md:text-3xl">Admin</h1>
        <div className="mt-6 md:grid md:grid-cols-[180px_1fr] gap-8">
          <nav className="flex md:flex-col gap-1 overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 pb-2 md:pb-0 mb-4 md:mb-0" aria-label="Admin sections">
            {TABS.map(([k, label]) => (
              <Link key={k} href={`/admin?tab=${k}`} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === k ? "bg-rs-green-700 text-white" : "text-rs-green-900 hover:bg-rs-green-100"}`} aria-current={tab === k ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="min-w-0">
            {tab === "project" && <ProjectTab projectId={project.id} />}
            {tab === "dao" && <DaoTab projectId={project.id} />}
            {tab === "buyers" && <BuyersTab />}
            {tab === "payments" && <PaymentsTab status={sp.status} method={sp.method} />}
            {tab === "designs" && <DesignsTab projectId={project.id} />}
            {tab === "marketing" && <MarketingTab />}
          </div>
        </div>
      </div>
    </Shell>
  );
}

async function ProjectTab({ projectId }: { projectId: string }) {
  const p = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const cover = await prisma.design.findFirst({ where: { projectId }, orderBy: { sort: "asc" } });
  return <ProjectForm project={plain({ ...p, listPriceIdr: p.listPriceIdr.toString() })} coverUrl={cover?.imageUrl ?? null} />;
}

async function DaoTab({ projectId }: { projectId: string }) {
  const p = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  let chain: ChainProject | null = null;
  let rpcError = "";
  if (p.onchainProjectId) {
    try { chain = await getChainProject(p.onchainProjectId); } catch (e) { rpcError = (e as Error).message; }
  }
  const proposals = await prisma.proposal.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
  const live = await Promise.all(proposals.map(async (x) => { try { return await getChainProposal(x.onchainProposalId); } catch { return null; } }));
  const holders = await prisma.investment.groupBy({ by: ["userId"], where: { projectId }, _sum: { shares: true } });
  return (
    <div className="flex flex-col gap-6">
      <section className="card">
        <h2 className="text-lg mb-3">On-chain status</h2>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm tabular">
          <dt className="text-rs-ink/60">DAO contract</dt><dd><AccountLink account={DAO_CONTRACT} /></dd>
          <dt className="text-rs-ink/60">Vault contract</dt><dd><AccountLink account={VAULT_CONTRACT} /></dd>
          <dt className="text-rs-ink/60">On-chain id</dt><dd className="mono break-all">{p.onchainProjectId ?? "— not created"}</dd>
          <dt className="text-rs-ink/60">Shares sold</dt><dd>{chain ? `${chain.shares_sold} / ${chain.total_shares}` : "—"}</dd>
          <dt className="text-rs-ink/60">Status</dt><dd>{chain ? <StatusPill status={chain.status} /> : "—"}</dd>
          <dt className="text-rs-ink/60">Holders (DB)</dt><dd>{holders.length}</dd>
        </dl>
        {rpcError && <p className="err">RPC: {rpcError}</p>}
      </section>
      <DaoActions
        onchain={!!p.onchainProjectId}
        status={chain?.status ?? p.status}
        defaultDescription={`Approve ${p.name} for funding`}
        proposals={proposals.map((x, i) => ({ id: x.id, onchainId: x.onchainProposalId, description: x.description, status: live[i]?.status ?? x.status, yes: live[i]?.yes_weight ?? x.yesWeight, no: live[i]?.no_weight ?? x.noWeight, createTx: x.createTx, finalizedTx: x.finalizedTx }))}
      />
    </div>
  );
}

async function BuyersTab() {
  const buyers = await prisma.user.findMany({
    where: { role: "buyer" },
    orderBy: { createdAt: "asc" },
    include: {
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
      loans: { orderBy: { createdAt: "desc" }, include: { periods: { select: { status: true } }, receipts: { orderBy: { periodIndex: "desc" }, take: 10 } } },
    },
  });
  return (
    <section className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-rs-border"><h2 className="text-lg">Buyers</h2></div>
      {buyers.length === 0 && <p className="p-5 text-sm text-rs-ink/60">No buyers yet.</p>}
      <ul>
        {buyers.map((b) => {
          const v = b.verifications[0];
          const loan = b.loans.find((l) => l.status === "active") ?? b.loans[0];
          const paid = loan?.periods.filter((x) => x.status === "paid").length ?? 0;
          const remaining = loan ? (loan.totalIdr ?? BigInt(0)) - (loan.monthlyIdr ?? BigInt(0)) * BigInt(paid) : null;
          return (
            <li key={b.id} className="border-t border-rs-border first:border-t-0" data-buyer-email={b.email} data-buyer-id={b.id}>
              <details>
                <summary className="px-5 py-4 cursor-pointer grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_auto] gap-2 items-center text-sm">
                  <span><strong>{b.displayName}</strong><br /><span className="text-rs-ink/60 break-all">{b.email}</span></span>
                  <span>{v?.verified ? <><StatusPill status="verified" /> <span className="text-xs text-rs-ink/60">{v.method}</span></> : <StatusPill status="not verified" />}</span>
                  <span className="tabular">{loan ? `${loan.mode}${loan.tenorMonths ? ` · ${loan.tenorMonths / 12} yr` : ""} · ${paid}/${loan.periods.length} · ${remaining !== null ? idr(remaining) : ""}` : "no loan"}</span>
                  <span className="flex gap-2">{!v?.verified && <VerifyButton userId={b.id} />}</span>
                </summary>
                <div className="px-5 pb-4 text-sm">
                  {loan?.createTx && <p>Loan: <span className="mono">{loan.id}</span> · <TxLink hash={loan.createTx} /></p>}
                  {loan && loan.receipts.length > 0 ? (
                    <ul className="mt-2 space-y-1">{loan.receipts.map((r) => <li key={r.id} className="tabular">Period {r.periodIndex} · {idr(r.amountIdr)} · <span className="mono">{r.receiptHash.slice(0, 10)}…</span> {r.txHash ? <TxLink hash={r.txHash} /> : <span className="text-[#B54708]">not recorded</span>}</li>)}</ul>
                  ) : <p className="text-rs-ink/60 mt-1">No repayment receipts.</p>}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function PaymentsTab({ status, method }: { status?: string; method?: string }) {
  const where = { ...(status ? { status } : {}), ...(method ? { method } : {}) };
  const payments = await prisma.payment.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { loan: { include: { user: true } } } });
  const receipts = await prisma.repaymentReceipt.findMany({ where: { loanId: { in: [...new Set(payments.map((p) => p.loanId))] } } });
  const rmap = new Map(receipts.map((r) => [`${r.loanId}:${r.periodIndex}`, r]));
  const total = payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amountIdr, BigInt(0));
  const origin = process.env.APP_URL || "";
  const f = (k: string, v: string | undefined) => {
    const q = new URLSearchParams({ tab: "payments", ...(status ? { status } : {}), ...(method ? { method } : {}) });
    if (v) q.set(k, v); else q.delete(k);
    return `/admin?${q.toString()}`;
  };
  return (
    <section className="card p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-rs-border flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-lg">Payments</h2>
        <div className="flex flex-wrap gap-1 text-xs">
          {[undefined, "pending", "paid", "expired", "failed"].map((x) => <Link key={x ?? "all"} href={f("status", x)} className={`rounded-full px-3 py-1 border ${status === x ? "bg-rs-green-700 text-white border-rs-green-700" : "border-rs-border"}`}>{x ?? "all status"}</Link>)}
          {[undefined, "va_bca", "va_bni", "va_mandiri", "qris"].map((x) => <Link key={x ?? "allm"} href={f("method", x)} className={`rounded-full px-3 py-1 border ${method === x ? "bg-rs-green-700 text-white border-rs-green-700" : "border-rs-border"}`}>{x ?? "all methods"}</Link>)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular min-w-[860px]">
          <thead className="bg-rs-bg text-left text-rs-ink/60"><tr><th className="px-4 py-2">Created</th><th>Buyer</th><th>Period</th><th>Method</th><th>Amount</th><th>Status</th><th>Receipt tx</th><th className="pr-4">Actions</th></tr></thead>
          <tbody>
            {payments.map((p) => {
              const r = rmap.get(`${p.loanId}:${p.periodIndex}`);
              return (
                <tr key={p.id} className="border-t border-rs-border">
                  <td className="px-4 py-2 whitespace-nowrap">{dateTimeId(p.createdAt)}</td>
                  <td>{p.loan.user.displayName}</td>
                  <td>{p.periodIndex}</td>
                  <td>{METHOD_LABEL[p.method as Method]?.replace(" (SIMULASI)", "")}</td>
                  <td>{idr(p.amountIdr)}</td>
                  <td><StatusPill status={p.status} /></td>
                  <td>{p.status === "paid" ? (r?.txHash ? <TxLink hash={r.txHash} /> : <span className="text-[#B54708]">missing</span>) : "—"}</td>
                  <td className="pr-4 py-2 whitespace-nowrap space-x-2">
                    <Link className="text-rs-green-700 underline" href={`/pay/${p.id}`}>Open /pay</Link>
                    <a className="text-rs-green-700 underline" href={simulatorUrl(origin, p.id)} target="_blank" rel="noreferrer">Open simulator</a>
                    {p.status === "paid" && r && !r.txHash && <RetryReceiptButton paymentId={p.id} />}
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-rs-ink/60">No payments yet.</td></tr>}
          </tbody>
          <tfoot><tr className="border-t border-rs-border font-semibold"><td className="px-4 py-2" colSpan={4}>Total paid ({payments.filter((p) => p.status === "paid").length})</td><td>{idr(total)}</td><td colSpan={3} /></tr></tfoot>
        </table>
      </div>
    </section>
  );
}

async function DesignsTab({ projectId }: { projectId: string }) {
  const designs = await prisma.design.findMany({ where: { projectId }, orderBy: { sort: "asc" } });
  const rooms = await prisma.room.findMany({ where: { projectId }, orderBy: { sort: "asc" } });
  return (
    <div className="flex flex-col gap-6">
      <DesignsAdmin designs={designs.map((d) => ({ id: d.id, kind: d.kind, title: d.title, imageUrl: d.imageUrl }))} />
      <RoomsAdmin rooms={plain(rooms).map((r) => ({ id: r.id, key: r.key, name: r.name, floor: r.floor, sizeM2: r.sizeM2, panoramaUrl: r.panoramaUrl, initialYaw: r.initialYaw, hotspots: r.hotspots as unknown[] }))} />
    </div>
  );
}

async function MarketingTab() {
  const sites = await prisma.marketingSite.findMany({ orderBy: { key: "asc" }, include: { reports: { orderBy: { createdAt: "desc" }, take: 12 } } });
  return <MarketingAdmin sites={plain(sites).map((s) => ({ id: s.id, key: s.key, name: s.name, url: s.url, purpose: s.purpose, reports: s.reports.map((r) => ({ id: r.id, createdAt: r.createdAt as unknown as string, weekOf: r.weekOf, report: r.report })) }))} />;
}
