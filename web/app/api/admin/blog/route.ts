import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";

/** Toggle a post's published flag: {id, published}. Bodies come from web/content/blog/*.md via the seed. */
export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const { id, published } = (await req.json()) as { id?: string; published?: boolean };
    if (!id || typeof published !== "boolean") return json({ error: "id and published are required" }, 400);
    const p = await prisma.blogPost.update({ where: { id }, data: { published } }).catch(() => null);
    if (!p) return json({ error: "Post not found" }, 404);
    return json({ ok: true, published: p.published });
  } catch (e) {
    return handleError(e);
  }
}
