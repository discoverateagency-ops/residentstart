import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";

const THRESHOLD = 0.6;
const MAX_FAILS = 3;

/** Receives the LIVE descriptor (numbers only, never an image) and compares it with the stored reference. */
export async function POST(req: Request) {
  try {
    const user = await requireRole("buyer");
    const { descriptor } = (await req.json()) as { descriptor?: number[] };
    if (!Array.isArray(descriptor) || descriptor.length !== 128 || !descriptor.every((x) => typeof x === "number" && Number.isFinite(x)))
      return json({ error: "No face detected in the camera frame" }, 400);
    const v = await prisma.verification.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (!v || !v.descriptor) return json({ error: "Upload a reference photo first" }, 400);
    if (v.verified) return json({ ok: true, verified: true, distance: v.distance, method: v.method });
    if (v.failedAttempts >= MAX_FAILS) return json({ ok: false, verified: false, attemptsLeft: 0, error: "Ask the admin to verify you" }, 429);
    const ref = v.descriptor as number[];
    const distance = Math.sqrt(ref.reduce((s, r, i) => s + (r - descriptor[i]) ** 2, 0));
    const rounded = Math.round(distance * 100) / 100;
    if (distance <= THRESHOLD) {
      await prisma.verification.update({ where: { id: v.id }, data: { verified: true, distance: rounded, method: "face-api-demo", verifiedAt: new Date() } });
      return json({ ok: true, verified: true, distance: rounded });
    }
    const updated = await prisma.verification.update({ where: { id: v.id }, data: { failedAttempts: { increment: 1 }, distance: rounded } });
    return json({ ok: true, verified: false, distance: rounded, attemptsLeft: Math.max(0, MAX_FAILS - updated.failedAttempts) });
  } catch (e) {
    return handleError(e);
  }
}
