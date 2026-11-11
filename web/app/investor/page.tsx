import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { FundingBar } from "@/components/FundingBar";
import { AccountLink, TxLink } from "@/components/TxLink";
import { AgentChat } from "@/components/AgentChat";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getMainProject } from "@/lib/project";
import { getChainHolding, getChainProposal } from "@/lib/near";
import { repaymentSummary } from "@/lib/repayments";
import { idr, pct } from "@/lib/format";
import { DAO_CONTRACT, VAULT_CONTRACT } from "@/lib/nearblocks";
import { InvestForm } from "./InvestForm";
import { ProposalCard } from "./ProposalCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investor dashboard" };

export default async function InvestorPage() {
  const s = await getSession();
  if (!s) redirect("/login?next=/investor");
  if (s.role !== "investor") redirect(s.role === "admin" ? "/admin" : "/buyer");
  const project = await getMainProject({ sync: true });
  if (!project) return <Shell><div className="container-rs py-10">No project yet.</div></Shell>;

  let holding = 0;
  if (project.onchainProjectId && s.nearAccountId) {
    try { holding = await getChainHolding(project.onchainProjectId, s.nearAccountId); } catch { holding = 0; }
  }
  const investments = await prisma.investment.findMany({ where: { userId: s.id, projectId: project.id }, orderBy: { createdAt: "desc" } });
  // net invested = shares bought × share price (remainders were refunded on-chain)
  const investedNear = investments.reduce((a, i) => a + i.shares * project.sharePriceNear, 0);

  const proposal = await prisma.proposal.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "desc" }, include: { votes: { where: { userId: s.id } } } });
  let yes = proposal?.yesWeight ?? 0, no = proposal?.noWeight ?? 0, pStatus = proposal?.status ?? "open";
  if (proposal) {
    try {
      const c = await getChainProposal(proposal.onchainProposalId);
      if (c) { yes = c.yes_weight; no = c.no_weight; pStatus = c.status; }
    } catch { /* keep DB values */ }
  }
  const rep = await repaymentSummary(project.id);
  const repPct = rep.totalPeriods ? (rep.paidPeriods / rep.totalPeriods) * 100 : 0;
  const remainingShares = project.totalShares - project.sharesSold;

  return (
    <Shell>
      <div className="container-rs py-8">
        <h1 className="text-2xl md:text-3xl">Hello, {s.displayName}</h1>
        {s.nearAccountId ? <div className="mt-1 text-sm"><AccountLink account={s.nearAccountId} /></div> : <p className="mt-1 text-sm text-rs-ink/60">No NEAR testnet account linked (demo)</p>}

        <div className="mt-6 grid md:grid-cols-[1fr_380px] gap-6">
          <div className="flex flex-col gap-6 min-w-0 order-2 md:order-1">
            <section className="card">
              <h2 className="text-lg mb-3">Invest</h2>
              <div className="flex flex-wrap justify-between gap-2 text-sm mb-2"><span className="font-medium">{project.name}</span><span className="tabular">{pct(project.totalShares ? (project.sharesSold / project.totalShares) * 100 : 0)}</span></div>
              <FundingBar sold={project.sharesSold} total={project.totalShares} />
              {holding === 0 && <p className="mt-3 text-sm text-rs-green-700 font-medium">Start with {project.sharePriceNear} NEAR to get your first share.</p>}
              <InvestForm
                sharePrice={project.sharePriceNear}
                remainingShares={remainingShares}
                onchain={!!project.onchainProjectId}
                canSign={!!s.nearAccountId}
                status={project.status}
              />
              {investments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {investments.slice(0, 5).map((i) => <TxLink key={i.id} hash={i.txHash} />)}
                </div>
              )}
            </section>

            <ProposalCard
              proposal={proposal ? { id: proposal.id, description: proposal.description, status: pStatus, yes, no, myVote: proposal.votes[0] ? { yes: proposal.votes[0].yes, weight: proposal.votes[0].weight, txHash: proposal.votes[0].txHash } : null } : null}
              myShares={holding}
            />

            <section className="card">
              <h2 className="text-lg mb-3">Repayments</h2>
              {rep.totalPeriods === 0 ? (
                <p className="text-sm text-rs-ink/70">No active loans yet. When a buyer confirms an installment, repayment progress appears here.</p>
              ) : (
                <>
                  <p className="text-sm tabular">{rep.loanCount} active loan{rep.loanCount === 1 ? "" : "s"} · {rep.paidPeriods} / {rep.totalPeriods} periods paid</p>
                  <div className="mt-2 h-2.5 rounded-full bg-rs-green-100 overflow-hidden"><div className="h-full bg-rs-green-700" style={{ width: `${repPct}%` }} /></div>
                  <p className="mt-2 text-sm tabular">{pct(repPct)} · remaining {idr(rep.remainingIdr)}</p>
                  <h3 className="text-sm mt-4 mb-2">Latest receipts</h3>
                  {rep.receipts.length === 0 ? <p className="text-sm text-rs-ink/60">No receipts yet.</p> : (
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-sm tabular min-w-[480px]">
                        <thead><tr className="text-left text-rs-ink/60"><th className="px-2 py-1">Period</th><th className="px-2">Amount</th><th className="px-2">Receipt hash</th><th className="px-2">Tx</th></tr></thead>
                        <tbody>
                          {rep.receipts.map((r) => (
                            <tr key={r.loanId + r.periodIndex} className="border-t border-rs-border">
                              <td className="px-2 py-2">{r.periodIndex}</td>
                              <td className="px-2">{idr(r.amountIdr)}</td>
                              <td className="px-2 mono" title={r.receiptHash}>{r.receiptHash.slice(0, 6)}…{r.receiptHash.slice(-3)}</td>
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

          <aside className="flex flex-col gap-6 md:sticky md:top-24 self-start w-full min-w-0 order-1 md:order-2">
            <div className="grid grid-cols-3 gap-3">
              <Tile label="My shares" value={String(holding)} />
              <Tile label="% of project" value={pct(project.totalShares ? (holding / project.totalShares) * 100 : 0)} />
              <Tile label="Invested" value={`${investedNear} NEAR`} />
            </div>
            <div className="text-xs text-rs-ink/60">DAO contract: <AccountLink account={DAO_CONTRACT} /></div>
            <AgentChat agent="investor" title="Ask the Investor Agent" chips={["How many shares are left?", "How does voting work?", "Show me the latest repayment"]} />
          </aside>
        </div>
      </div>
    </Shell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-rs-border p-3">
      <div className="text-[11px] text-rs-ink/60">{label}</div>
      <div className="font-[family-name:var(--font-heading)] font-semibold text-rs-green-900 tabular text-base md:text-lg whitespace-nowrap">{value}</div>
    </div>
  );
}
