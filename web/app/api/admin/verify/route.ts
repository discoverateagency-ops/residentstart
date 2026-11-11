import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";

/** Admin override: marks a buyer verified (method admin-override). */
export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const { userId } = (await req.json()) as { userId?: string };
    const u = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!u || u.role !== "buyer") return json({ error: "Buyer not found" }, 404);
    const v = await prisma.verification.findFirst({ where: { userId: u.id }, orderBy: { createdAt: "desc" } });
    if (v) await prisma.verification.update({ where: { id: v.id }, data: { verified: true, method: "admin-override", verifiedAt: new Date() } });
    else await prisma.verification.create({ data: { userId: u.id, verified: true, method: "admin-override", verifiedAt: new Date() } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
