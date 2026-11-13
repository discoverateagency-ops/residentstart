import "server-only";
// Builds CONTEXT JSON for the agents exactly as docs/PRD.md "Runtime prompts" defines, plus KNOWLEDGE loading.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "./db";
import { defaultBuyerProject, getProjectBySlug, projectPricing, syncFromChain, tenors } from "./project";
import type { Project } from "@prisma/client";
import { getChainHolding, getChainProposal, DAO, VAULT } from "./near";
import { repaymentSummary } from "./repayments";
import { idr } from "./format";

const NEARBLOCKS = process.env.NEARBLOCKS_BASE || "https://testnet.nearblocks.io";
const ROOT = process.cwd();

export function readPrompt(name: "guardrails" | "investor_agent" | "buyer_agent" | "marketing_agent"): string {
  // prompts/ lives at the repo root; web/prompts is a copy for deployments where web/ is the root
  for (const p of [join(ROOT, "prompts", `${name}.txt`), join(ROOT, "..", "prompts", `${name}.txt`)]) {
    try {
      return readFileSync(p, "utf8");
    } catch {
      /* try next */
    }
  }
  throw new Error(`Prompt ${name} not found`);
}

export function loadKnowledge(agent: "investor" | "buyer"): string {
  const dir = join(ROOT, "data", "knowledge");
  return `${readFileSync(join(dir, "common.md"), "utf8")}\n\n${readFileSync(join(dir, `${agent}.md`), "utf8")}`;
}

async function projectBase(slug?: string | null) {
  let p: Project | null = slug ? await getProjectBySlug(slug) : null;
  if (!p) p = await prisma.project.findFirst({ where: { published: true, status: "funding" }, orderBy: { sortOrder: "asc" } }) ?? (await defaultBuyerProject());
  if (!p) throw new Error("No project");
  p = await syncFromChain(p);
  const { cash_price_idr, table } = projectPricing(p);
  return { p, cash_price_idr, table };
}

/** If the question names another project ("Jagakarsa"), answer about that one. */
export async function projectMentioned(message: string): Promise<string | null> {
  const q = message.toLowerCase();
  const ps = await prisma.project.findMany({ where: { published: true }, select: { slug: true, name: true, area: true } });
  const hit = ps.find((p) => {
    const short = p.name.replace("Residentstart ", "").toLowerCase();
    const key = short.split(" ")[0];
    return q.includes(short) || (key.length > 3 && q.includes(key));
  });
  return hit?.slug ?? null;
}

export async function buildInvestorContext(userId: string, slug?: string | null) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const { p, cash_price_idr } = await projectBase(slug);
  let shares = 0;
  if (p.onchainProjectId && user.nearAccountId) {
    try {
      shares = await getChainHolding(p.onchainProjectId, user.nearAccountId);
    } catch {
      shares = 0;
    }
  }
  const inv = await prisma.investment.findMany({ where: { userId, projectId: p.id }, orderBy: { createdAt: "desc" } });
  const proposal = await prisma.proposal.findFirst({ where: { projectId: p.id }, orderBy: { createdAt: "desc" }, include: { votes: { where: { userId } } } });
  let yes = proposal?.yesWeight ?? 0, no = proposal?.noWeight ?? 0, status = proposal?.status ?? null;
  if (proposal) {
    try {
      const c = await getChainProposal(proposal.onchainProposalId);
      if (c) ({ yes_weight: yes, no_weight: no, status } = c);
    } catch { /* DB values */ }
  }
  const rep = await repaymentSummary(); // DAO pool: all homes
  const last = rep.receipts[0];
  return {
    PROJECT: {
      slug: p.slug,
      name: p.name,
      location: p.location,
      type: p.type,
      units: p.units,
      certificate: p.certificate,
      land_m2: p.landM2,
      building_m2: p.buildingM2,
      list_price_idr: Number(p.listPriceIdr),
      cash_price_idr,
      tenor_years: tenors(p),
      share_price_near: p.sharePriceNear,
      total_shares: p.totalShares,
      shares_sold: p.sharesSold,
      shares_remaining: p.totalShares - p.sharesSold,
      funded_pct: Math.round((p.sharesSold / p.totalShares) * 1000) / 10,
      status: p.status,
      dao_contract: DAO,
      vault_contract: VAULT,
      nearblocks_base: NEARBLOCKS,
    },
    MY_HOLDING: {
      near_account: user.nearAccountId,
      shares,
      pct_of_project: Math.round((shares / p.totalShares) * 1000) / 10,
      invested_near: inv.reduce((a, i) => a + i.shares * p.sharePriceNear, 0),
      tx_hashes: inv.slice(0, 5).map((i) => i.txHash),
    },
    PROPOSAL: proposal
      ? { id: proposal.onchainProposalId, kind: proposal.kind, description: proposal.description, yes_weight: yes, no_weight: no, status, my_vote: proposal.votes[0] ? (proposal.votes[0].yes ? "yes" : "no") : null }
      : null,
    REPAYMENT: {
      loan_count: rep.loanCount,
      total_periods: rep.totalPeriods,
      paid_periods: rep.paidPeriods,
      last_receipt_hash: last?.receiptHash ?? null,
      last_receipt_tx: last?.txHash ? `${NEARBLOCKS}/txns/${last.txHash}` : null,
      remaining_idr: Number(rep.remainingIdr),
    },
  };
}

export async function buildBuyerContext(userId: string, slug?: string | null) {
  const anyLoan = await prisma.loan.findFirst({ where: { userId, status: { in: ["active", "completed"] } }, orderBy: { createdAt: "desc" }, include: { project: { select: { slug: true } } } });
  const { p, cash_price_idr, table } = await projectBase(slug ?? anyLoan?.project.slug);
  const rooms = (p.roomsSpec as { name: string; floor: number; size_m2: number; notes: string }[]) ?? [];
  const loan = await prisma.loan.findFirst({ where: { userId, projectId: p.id, status: { in: ["active", "completed"] } }, orderBy: { createdAt: "desc" }, include: { periods: { orderBy: { periodIndex: "asc" } } } });
  const verification = await prisma.verification.findFirst({ where: { userId, verified: true } });
  let MY_LOAN = null;
  if (loan) {
    const next = loan.periods.find((x) => x.status === "due");
    MY_LOAN = {
      mode: loan.mode,
      tenor_years: loan.tenorMonths ? loan.tenorMonths / 12 : null,
      monthly_idr: loan.monthlyIdr ? Number(loan.monthlyIdr) : null,
      paid_periods: loan.periods.filter((x) => x.status === "paid").length,
      total_periods: loan.periods.length,
      next_period: next?.periodIndex ?? null,
      next_due_date: next ? next.dueDate.toISOString().slice(0, 10) : null,
      status: loan.status,
    };
  }
  return {
    PROJECT: {
      slug: p.slug,
      name: p.name,
      location: p.location,
      type: p.type,
      certificate: p.certificate,
      units: p.units,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      land_m2: p.landM2,
      building_m2: p.buildingM2,
      floors: p.floors,
      list_price_idr: Number(p.listPriceIdr),
      cash_discount_pct: p.cashDiscountPct,
      cash_price_idr,
      down_payment_pct: p.downPaymentPct,
      annual_rate_pct: p.annualRatePct,
      tenor_years: tenors(p),
      status: p.status,
      included: p.included,
      not_included: p.notIncluded,
    },
    ROOMS: rooms.map((r) => ({ name: r.name, size_m2: r.size_m2, floor: r.floor, notes: r.notes })),
    ROOMS_NOTE: p.slug === "cilandak-residence" ? "Rooms of this house (show unit)." : "Room table is the Cilandak show unit (same unit type); this home's total land/building areas are in PROJECT.",
    PRICING_TABLE: table,
    MY_LOAN,
    MY_VERIFICATION: { verified: !!verification },
  };
}

export async function buildMarketingContext(siteId: string) {
  const site = await prisma.marketingSite.findUniqueOrThrow({ where: { id: siteId } });
  const { p } = await projectBase("cilandak-residence");
  const prev = await prisma.marketingReport.findFirst({ where: { siteId }, orderBy: { createdAt: "desc" } });
  return {
    SITE: { name: site.name, url: site.url, purpose: site.purpose, target_audience: site.targetAudience, language: site.language },
    PROJECT: { name: p.name, location: p.location, type: p.type, list_price_idr: Number(p.listPriceIdr), tenor_years: tenors(p), status: p.status },
    PREVIOUS_REPORT: prev?.report ?? null,
  };
}

/** Flat {brace} variables for the mock provider, derived from the same CONTEXT. */
export function mockVarsInvestor(ctx: Awaited<ReturnType<typeof buildInvestorContext>>): Record<string, string> {
  const P = ctx.PROJECT, R = ctx.REPAYMENT;
  return {
    project_name: P.name,
    shares_remaining: String(P.shares_remaining),
    total_shares: String(P.total_shares),
    share_pct: (Math.round((100 / P.total_shares) * 100) / 100).toLocaleString("id-ID"),
    share_price_near: String(P.share_price_near),
    funded_pct: String(P.funded_pct).replace(".", ","),
    my_shares: String(ctx.MY_HOLDING.shares),
    status: P.status,
    paid_periods: String(R.paid_periods),
    total_periods: String(R.total_periods),
    last_receipt_hash: R.last_receipt_hash ?? "(no receipt yet)",
    last_receipt_tx: R.last_receipt_tx ?? `${NEARBLOCKS}/address/${VAULT}`,
    dao_url: `${NEARBLOCKS}/address/${DAO}`,
    my_tx_links: ctx.MY_HOLDING.tx_hashes.length ? ctx.MY_HOLDING.tx_hashes.map((h) => `${NEARBLOCKS}/txns/${h}`).join(" , ") : "(no transactions yet)",
  };
}

export function mockVarsBuyer(ctx: Awaited<ReturnType<typeof buildBuyerContext>>): Record<string, string> {
  const inc = (ctx.PROJECT.included as string[]) ?? [];
  const notInc = (ctx.PROJECT.not_included as string[]) ?? [];
  const room = (re: RegExp) => ctx.ROOMS.find((r) => re.test(r.name));
  const master = room(/master bedroom/i), kitchen = room(/^kitchen/i);
  const v: Record<string, string> = {
    project_name: ctx.PROJECT.name,
    included_list: inc.join("; "),
    not_included_list: notInc.join("; "),
    master_size: master ? `${master.size_m2} m²` : "not listed",
    master_notes: master?.notes ?? "",
    kitchen_size: kitchen ? `${kitchen.size_m2} m²` : "not listed",
    kitchen_notes: kitchen?.notes ?? "",
    specs: `${ctx.PROJECT.bedrooms} bedrooms, ${ctx.PROJECT.bathrooms} bathrooms, land ${ctx.PROJECT.land_m2} m², building ${ctx.PROJECT.building_m2} m², ${ctx.PROJECT.floors} floors, ${ctx.PROJECT.certificate}`,
    cash_price_idr: idr(ctx.PROJECT.cash_price_idr),
    list_price_idr: idr(ctx.PROJECT.list_price_idr),
    verified: String(ctx.MY_VERIFICATION.verified),
    next_period: ctx.MY_LOAN?.next_period ? String(ctx.MY_LOAN.next_period) : "(no loan yet)",
    next_due_date: ctx.MY_LOAN?.next_due_date ?? "(no loan yet)",
    monthly_idr: ctx.MY_LOAN?.monthly_idr ? idr(ctx.MY_LOAN.monthly_idr) : "(no loan yet)",
  };
  for (const r of ctx.PRICING_TABLE) {
    v[`dp_${r.tenor_years}`] = idr(r.down_payment_idr);
    v[`monthly_${r.tenor_years}`] = idr(r.monthly_idr);
    v[`total_${r.tenor_years}`] = idr(r.total_idr);
  }
  return v;
}
