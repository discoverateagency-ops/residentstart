import "server-only";
import { prisma } from "./db";
import { getChainProject } from "./near";
import { pricingTable, cashPrice, type PricingInput } from "./pricing";
import type { Project } from "@prisma/client";

export function pricingInput(p: Project): PricingInput {
  return {
    listPriceIdr: Number(p.listPriceIdr),
    cashDiscountPct: p.cashDiscountPct,
    downPaymentPct: p.downPaymentPct,
    annualRatePct: p.annualRatePct,
  };
}

export function tenors(p: Project): number[] {
  return (p.tenorYears as number[]).map(Number).sort((a, b) => a - b);
}

export function projectPricing(p: Project) {
  const inp = pricingInput(p);
  return { cash_price_idr: cashPrice(inp), table: pricingTable(inp, tenors(p)) };
}

/** Reads on-chain shares_sold/status and mirrors them into the DB. Never throws (RPC hiccups fall back to DB values). */
export async function syncFromChain(p: Project): Promise<Project> {
  if (!p.onchainProjectId) return p;
  try {
    const c = await getChainProject(p.onchainProjectId);
    if (!c) return p;
    const status = p.status === "in_construction" || p.status === "completed" ? (c.status === "funded" || c.status === "funding" ? p.status : c.status) : c.status;
    if (c.shares_sold !== p.sharesSold || status !== p.status) {
      return await prisma.project.update({ where: { id: p.id }, data: { sharesSold: c.shares_sold, status } });
    }
    return p;
  } catch (e) {
    console.warn("[syncFromChain] RPC failed, using DB values:", (e as Error).message);
    return p;
  }
}

export async function getMainProject(opts: { sync?: boolean } = {}) {
  const p = await prisma.project.findFirst({ where: { published: true }, orderBy: { slug: "asc" } });
  if (!p) return null;
  return opts.sync ? syncFromChain(p) : p;
}

export async function getProjectBySlug(slug: string, opts: { sync?: boolean } = {}) {
  const p = await prisma.project.findUnique({ where: { slug } });
  if (!p) return null;
  return opts.sync ? syncFromChain(p) : p;
}
