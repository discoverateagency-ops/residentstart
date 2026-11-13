import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";

const Body = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(2000),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  landM2: z.coerce.number().int().min(1).max(100000),
  buildingM2: z.coerce.number().int().min(1).max(100000),
  floors: z.coerce.number().int().min(1).max(10),
  listPriceIdr: z.coerce.number().int().min(1).max(1e13),
  cashDiscountPct: z.coerce.number().int().min(0).max(50),
  downPaymentPct: z.coerce.number().int().min(0).max(90),
  annualRatePct: z.coerce.number().min(0).max(30),
  tenorYears: z.array(z.coerce.number().int().min(1).max(30)).min(1).max(6),
  status: z.enum(["funding", "funded", "in_construction", "completed"]),
  published: z.boolean(),
  sharePriceNear: z.coerce.number().int().min(1).max(10000),
  totalShares: z.coerce.number().int().min(1).max(100000),
  included: z.array(z.string().trim().min(1)).max(40),
  notIncluded: z.array(z.string().trim().min(1)).max(40),
  area: z.string().trim().min(1).max(60),
  descriptionLong: z.string().trim().max(4000),
  coverUrl: z.string().trim().min(1).max(500),
  photos: z.array(z.object({ kind: z.string().trim().min(1).max(30), url: z.string().trim().min(1).max(500), alt: z.string().trim().max(200) })).min(1).max(20),
  tourSetId: z.string().trim().max(100).nullable(),
  units: z.coerce.number().int().min(1).max(500),
  certificate: z.enum(["SHM", "HGB"]),
  nearby: z.array(z.object({ name: z.string().trim().min(1).max(80), kind: z.enum(["transport", "school", "mall", "hospital", "other"]), distance_km: z.coerce.number().min(0).max(100) })).max(8),
});

export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` }, 400);
    const { id, listPriceIdr, sharePriceNear, totalShares, ...rest } = parsed.data;
    const cur = await prisma.project.findUnique({ where: { id } });
    if (!cur) return json({ error: "Project not found" }, 404);
    // share price / total shares are fixed once the project exists on-chain
    const lockShares = !!cur.onchainProjectId;
    if (lockShares && (sharePriceNear !== cur.sharePriceNear || totalShares !== cur.totalShares)) {
      return json({ error: "Share price and total shares are fixed once the project is on-chain" }, 400);
    }
    if (rest.tourSetId && !(await prisma.tourSet.findUnique({ where: { id: rest.tourSetId } }))) return json({ error: "Unknown tour set" }, 400);
    if (cur.onchainProjectId && cur.status === "funding" && rest.status !== "funding") return json({ error: "Funding status is driven by the DAO contract; finalize the proposal from the DAO tab" }, 400);
    const p = await prisma.project.update({
      where: { id },
      data: { ...rest, tenorYears: [...new Set(rest.tenorYears)].sort((a, b) => a - b), listPriceIdr: BigInt(listPriceIdr), sharePriceNear, totalShares },
    });
    return json({ ok: true, project: p });
  } catch (e) {
    return handleError(e);
  }
}
