import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, dashboardPath, type Role } from "@/lib/session";
import { json, handleError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) return json({ error: "Email and password are required" }, 400);
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return json({ error: "Wrong email or password" }, 401);
    await createSession(user.id, user.role as Role);
    return json({ ok: true, role: user.role, redirect: dashboardPath(user.role as Role) });
  } catch (e) {
    return handleError(e);
  }
}
