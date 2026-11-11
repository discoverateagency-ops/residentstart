import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

export type Role = "investor" | "buyer" | "admin";
export type SessionUser = { id: string; email: string; role: Role; displayName: string; nearAccountId: string | null };

const COOKIE = "rs_session";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me");

export async function createSession(userId: string, role: Role) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const u = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!u) return null;
    return { id: u.id, email: u.email, role: u.role as Role, displayName: u.displayName, nearAccountId: u.nearAccountId };
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** For API routes: throws HttpError(401/403). */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please log in");
  if (roles.length && !roles.includes(s.role)) throw new HttpError(403, "Not allowed for your role");
  return s;
}

export function dashboardPath(role: Role) {
  return role === "admin" ? "/admin" : role === "investor" ? "/investor" : "/buyer";
}
