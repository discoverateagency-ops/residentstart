import "server-only";
import { prisma } from "./db";
import { getChainProject } from "./near";
import { pricingTable, cashPrice, monthly, type PricingInput } from "./pricing";
import type { Project, TourSet } from "@prisma/client";

export type Audience = "buyer" | "investor";
/** PRD-2: audience is computed from status, never stored. */
export function audienceOf(status: string): Audience {
  return status === "funding" ? "investor" : "buyer";
}
export const BUYER_STATUSES = ["funded", "in_construction", "completed"];

export function projectHref(p: { slug: string; status: string }) {
  return audienceOf(p.status) === "investor" ? `/invest/${p.slug}` : `/buy/${p.slug}`;
}
export function tourHref(p: { slug: string; status: string }) {
  return `${projectHref(p)}/tour`;
}

export function pricingInput(p: Project): PricingInput {
  return { listPriceIdr: Number(p.listPriceIdr), cashDiscountPct: p.cashDiscountPct, downPaymentPct: p.downPaymentPct, annualRatePct: p.annualRatePct };
}

export function tenors(p: Project): number[] {
  return (p.tenorYears as number[]).map(Number).sort((a, b) => a - b);
}

export function projectPricing(p: Project) {
  const inp = pricingInput(p);
  return { cash_price_idr: cashPrice(inp), table: pricingTable(inp, tenors(p)) };
}

/** Smallest monthly (longest tenor), for "Cicilan mulai …". */
export function fromMonthly(p: Project): { monthly: number; years: number } {
  const t = tenors(p);
  const years = t[t.length - 1] ?? 15;
  return { monthly: monthly(pricingInput(p), years), years };
}

export type Photo = { kind: string; url: string; alt: string };
export const photosOf = (p: Project) => (p.photos as Photo[]) ?? [];
export const floorplansOf = (p: Project) => (p.floorplans as string[]) ?? [];
export type Nearby = { name: string; kind: string; distance_km: number };
export const nearbyOf = (p: Project) => (p.nearby as Nearby[]) ?? [];

/** Tour label per PRD-2: own show unit / show-unit reference (buyer) / show-unit preview (investor). */
export function tourLabel(p: Project, set: TourSet | null): string {
  if (!set) return "";
  const own = (set.config as { project?: string })?.project === p.slug;
  if (audienceOf(p.status) === "investor") return "Show-unit preview — design reference";
  return own ? "Photo walkthrough · show unit" : `Show-unit reference — ${p.name.replace("Residentstart ", "")} uses the same unit type`;
}

/** Reads on-chain shares_sold/status and mirrors them into the DB. Never throws (RPC hiccups fall back to DB values). */
export async function syncFromChain(p: Project): Promise<Project> {
  if (!p.onchainProjectId) return p;
  try {
    const c = await getChainProject(p.onchainProjectId);
    if (!c) return p;
    // the chain only knows funding/funded; later lifecycle states are kept from the DB
    const status = (p.status === "in_construction" || p.status === "completed") && c.status === "funded" ? p.status : c.status;
    if (c.shares_sold !== p.sharesSold || status !== p.status) {
      return await prisma.project.update({ where: { id: p.id }, data: { sharesSold: c.shares_sold, status } });
    }
    return p;
  } catch (e) {
    console.warn("[syncFromChain] RPC failed, using DB values:", (e as Error).message);
    return p;
  }
}

export async function syncMany(ps: Project[]): Promise<Project[]> {
  return Promise.all(ps.map((p) => syncFromChain(p)));
}

export async function listProjects(opts: { audience?: Audience; sync?: boolean } = {}) {
  let ps = await prisma.project.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] });
  if (opts.sync) ps = await syncMany(ps);
  return opts.audience ? ps.filter((p) => audienceOf(p.status) === opts.audience) : ps;
}

export async function getProjectBySlug(slug: string, opts: { sync?: boolean } = {}) {
  const p = await prisma.project.findUnique({ where: { slug }, include: { tourSet: true } });
  if (!p) return null;
  if (!opts.sync) return p;
  const synced = await syncFromChain(p);
  return { ...synced, tourSet: p.tourSet };
}

/** Units still available = units − active/completed purchases. */
export async function unitsLeft(projectIds: string[]): Promise<Record<string, number>> {
  const ps = await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, units: true } });
  const counts = await prisma.loan.groupBy({ by: ["projectId"], where: { projectId: { in: projectIds }, status: { in: ["active", "completed"] } }, _count: true });
  const m = new Map(counts.map((c) => [c.projectId, c._count]));
  return Object.fromEntries(ps.map((p) => [p.id, Math.max(0, p.units - (m.get(p.id) ?? 0))]));
}

/** Default project for the buyer dashboard / agents when none is given. */
export async function defaultBuyerProject() {
  const ps = await listProjects({ audience: "buyer" });
  return ps[0] ?? null;
}
