import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { projectHref } from "@/lib/project";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await prisma.project.findUnique({ where: { slug }, select: { slug: true, status: true } });
  return NextResponse.redirect(new URL(p ? `${projectHref(p)}/tour` : "/buy", req.url), 301);
}
