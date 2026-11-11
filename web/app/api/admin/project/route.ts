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
    const p = await prisma.project.update({
      where: { id },
      data: { ...rest, tenorYears: [...new Set(rest.tenorYears)].sort((a, b) => a - b), listPriceIdr: BigInt(listPriceIdr), sharePriceNear, totalShares },
    });
    return json({ ok: true, project: p });
  } catch (e) {
    return handleError(e);
  }
}
