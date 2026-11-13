import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { FundingBar } from "@/components/FundingBar";
import { AccountLink, TxLink } from "@/components/TxLink";
import { AgentChat } from "@/components/AgentChat";
import { StatusPill } from "@/components/StatusPill";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { syncFromChain } from "@/lib/project";
import { getChainHolding, getChainProposal } from "@/lib/near";
import { repaymentSummary } from "@/lib/repayments";
import { idr, pct } from "@/lib/format";
import { DAO_CONTRACT, VAULT_CONTRACT } from "@/lib/nearblocks";
import { InvestForm } from "./InvestForm";
import { ProposalCard } from "./ProposalCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investor dashboard" };

export default async function InvestorPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const s = await getSession();
  const { project: want } = await searchParams;
  if (!s) redirect(`/login?role=investor&next=${encodeURIComponent(want ? `/investor?project=${want}` : "/investor")}`);
  if (s.role !== "investor") redirect(s.role === "admin" ? "/admin" : "/buyer");

  // selectable: projects that are funding, or on-chain projects this investor holds shares in
  const all = await prisma.project.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  const myProjects = new Set((await prisma.investment.findMany({ where: { userId: s.id }, select: { projectId: true } })).map((i) => i.projectId));
  const options = all.filter((p) => p.status === "funding" || (p.onchainProjectId && myProjects.has(p.id)));
  const chosen = options.find((p) => p.slug === want) ?? options.find((p) => p.status === "funding") ?? options[0];
  if (!chosen) {
    return <Shell app><div className="container-rs py-10"><div className="card max-w-lg"><h1 className="text-2xl">No project open for funding</h1><p className="mt-2 text-rs-ink/70">Check back when the next project opens.</p><Link href="/invest" className="btn-primary mt-4">For Investor</Link></div></div></Shell>;
  }
  const project = await syncFromChain(chosen);

  let holding = 0;
  if (project.onchainProjectId && s.nearAccountId) {
    try { holding = await getChainHolding(project.onchainProjectId, s.nearAccountId); } catch { holding = 0; }
  }
  const investments = await prisma.investment.findMany({ where: { userId: s.id, projectId: project.id }, orderBy: { createdAt: "desc" } });
  const investedNear = investments.reduce((a, i) => a + i.shares * project.sharePriceNear, 0);

  const proposal = await prisma.proposal.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, include: { votes: { where: { userId: s.id } } } });
  let yes = proposal?.yesWeight ?? 0, no = proposal?.noWeight ?? 0, pStatus = proposal?.status ?? "open";
  if (proposal) {
    try {
      const c = await getChainProposal(proposal.onchainProposalId);
      if (c) { yes = c.yes_weight; no = c.no_weight; pStatus = c.status; }
    } catch { /* keep DB values */ }
  }
  const rep = await repaymentSummary();
  const repPct = rep.totalPeriods ? (rep.paidPeriods / rep.totalPeriods) * 100 : 0;
  const remainingShares = project.totalShares - project.sharesSold;

  return (
    <Shell app>
      <div className="container-rs py-8">
        <h1 className="text-2xl md:text-3xl">Hello, {s.displayName}</h1>
        {s.nearAccountId ? <div className="mt-1 text-sm"><AccountLink account={s.nearAccountId} /></div> : <p className="mt-1 text-sm text-rs-ink/60">No NEAR testnet account linked (demo)</p>}

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Choose project">
          {options.map((o) => (
            <Link key={o.id} href={`/investor?project=${o.slug}`} aria-current={o.id === project.id ? "page" : undefined} className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${o.id === project.id ? "border-rs-green-700 bg-rs-green-700 text-white" : "border-rs-border bg-white text-rs-green-900 hover:border-rs-green-500"}`}>
              {o.name.replace("Residentstart ", "")}
            </Link>
          ))}
        </nav>

        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_380px]">
          <div className="order-2 flex min-w-0 flex-col gap-6 md:order-1">
            <section className="card">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg">Invest · <Link href={`/invest/${project.slug}`} className="text-rs-green-700 hover:underline">{project.name.replace("Residentstart ", "")}</Link></h2>
                <StatusPill status={project.status} />
              </div>
              <p className="mb-2 text-sm text-rs-ink/70">{project.location} · {project.sharePriceNear} NEAR / share · target {project.totalShares * project.sharePriceNear} NEAR</p>
              <FundingBar sold={project.sharesSold} total={project.totalShares} />
              {holding === 0 && project.status === "funding" && <p className="mt-3 text-sm font-medium text-rs-green-700">Start with {project.sharePriceNear} NEAR to get your first share.</p>}
              <InvestForm projectSlug={project.slug} sharePrice={project.sharePriceNear} remainingShares={remainingShares} onchain={!!project.onchainProjectId} canSign={!!s.nearAccountId} status={project.status} />
              {investments.length > 0 && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">{investments.slice(0, 5).map((i) => <TxLink key={i.id} hash={i.txHash} />)}</div>}
            </section>

            <ProposalCard
              proposal={proposal ? { id: proposal.id, description: proposal.description, status: pStatus, yes, no, myVote: proposal.votes[0] ? { yes: proposal.votes[0].yes, weight: proposal.votes[0].weight, txHash: proposal.votes[0].txHash } : null } : null}
              myShares={holding}
            />

            <section className="card">
              <h2 className="mb-1 text-lg">Repayments · DAO pool</h2>
              <p className="mb-3 text-[13px] text-rs-ink/60">Installments on every Residentstart home are financed by the DAO pool; each paid period is recorded on the vault contract.</p>
              {rep.totalPeriods === 0 ? (
                <p className="text-sm text-rs-ink/70">No active loans yet. When a buyer confirms an installment, repayment progress appears here.</p>
              ) : (
                <>
                  <p className="text-sm tabular">{rep.loanCount} active loan{rep.loanCount === 1 ? "" : "s"} · {rep.paidPeriods} / {rep.totalPeriods} periods paid</p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-rs-green-100"><div className="h-full bg-rs-green-700" style={{ width: `${repPct}%` }} /></div>
                  <p className="mt-2 text-sm tabular">{pct(repPct)} · remaining {idr(rep.remainingIdr)}</p>
                  <h3 className="mb-2 mt-4 text-sm">Latest receipts</h3>
                  {rep.receipts.length === 0 ? <p className="text-sm text-rs-ink/60">No receipts yet.</p> : (
                    <div className="-mx-2 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm tabular">
                        <thead><tr className="text-left text-rs-ink/60"><th className="px-2 py-1">Home</th><th className="px-2">Period</th><th className="px-2">Amount</th><th className="px-2">Receipt hash</th><th className="px-2">Tx</th></tr></thead>
                        <tbody>
                          {rep.receipts.map((r) => (
                            <tr key={r.loanId + r.periodIndex} className="border-t border-rs-border">
                              <td className="px-2 py-2">{r.projectName.replace("Residentstart ", "")}</td>
                              <td className="px-2">{r.periodIndex}</td>
                              <td className="px-2">{idr(r.amountIdr)}</td>
                              <td className="mono px-2" title={r.receiptHash}>{r.receiptHash.slice(0, 6)}…{r.receiptHash.slice(-3)}</td>
                              <td className="px-2">{r.txHash ? <TxLink hash={r.txHash} /> : <span className="text-[#B54708]">recording…</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              <div className="mt-3 text-sm"><AccountLink account={VAULT_CONTRACT} /></div>
            </section>
          </div>

          <aside className="order-1 flex w-full min-w-0 flex-col gap-6 self-start md:order-2 md:sticky md:top-24">
            <div className="grid grid-cols-3 gap-3">
              <Tile label="My shares" value={String(holding)} />
              <Tile label="% of project" value={pct(project.totalShares ? (holding / project.totalShares) * 100 : 0)} />
              <Tile label="Invested" value={`${investedNear} NEAR`} />
            </div>
            <div className="text-xs text-rs-ink/60">DAO contract: <AccountLink account={DAO_CONTRACT} /></div>
            <div id="agent" className="scroll-mt-24"><AgentChat agent="investor" project={project.slug} title="Ask the Investor Agent" chips={["How many shares are left?", "How does voting work?", "Show me the latest repayment"]} /></div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rs-border bg-white p-3">
      <div className="text-[11px] text-rs-ink/60">{label}</div>
      <div className="whitespace-nowrap font-[family-name:var(--font-heading)] text-base font-semibold text-rs-green-900 tabular md:text-lg">{value}</div>
    </div>
  );
}
