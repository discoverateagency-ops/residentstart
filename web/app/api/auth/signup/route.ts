import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, dashboardPath, type Role } from "@/lib/session";
import { json, handleError } from "@/lib/http";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().min(1, "Display name is required").max(60),
  role: z.enum(["investor", "buyer"]),
});

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
    const { email, password, displayName, role } = parsed.data;
    const normalized = email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email: normalized } })) return json({ error: "An account with this email already exists" }, 409);
    const user = await prisma.user.create({
      data: { email: normalized, passwordHash: await bcrypt.hash(password, 10), displayName, role, nearAccountId: null },
    });
    await createSession(user.id, role as Role);
    return json({ ok: true, role, redirect: dashboardPath(role as Role), userId: user.id });
  } catch (e) {
    return handleError(e);
  }
}
