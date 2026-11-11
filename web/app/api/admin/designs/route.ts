import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { uploadFile, IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { getMainProject } from "@/lib/project";

/** multipart: file, kind (floor_plan|render), title, sort */
export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const project = await getMainProject();
    if (!project) return json({ error: "No project" }, 404);
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "render");
    const title = String(form.get("title") || "").trim();
    if (!(file instanceof File)) return json({ error: "Choose an image" }, 400);
    if (!IMAGE_TYPES.includes(file.type)) return json({ error: "Image must be JPEG, PNG, WebP or SVG" }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return json({ error: "Max 8 MB" }, 400);
    if (!["floor_plan", "render"].includes(kind)) return json({ error: "Invalid kind" }, 400);
    if (!title) return json({ error: "Title is required" }, 400);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const url = await uploadFile(`designs/${randomUUID()}.${ext}`, await file.arrayBuffer(), file.type);
    const max = await prisma.design.aggregate({ where: { projectId: project.id }, _max: { sort: true } });
    const d = await prisma.design.create({ data: { projectId: project.id, kind, title, imageUrl: url, sort: (max._max.sort ?? -1) + 1 } });
    return json({ ok: true, design: d });
  } catch (e) {
    return handleError(e);
  }
}

/** JSON: {id, action: "up"|"down"|"delete"} */
export async function PATCH(req: Request) {
  try {
    await requireRole("admin");
    const { id, action } = (await req.json()) as { id?: string; action?: string };
    const d = id ? await prisma.design.findUnique({ where: { id } }) : null;
    if (!d) return json({ error: "Design not found" }, 404);
    if (action === "delete") {
      await prisma.design.delete({ where: { id: d.id } });
      return json({ ok: true });
    }
    const all = await prisma.design.findMany({ where: { projectId: d.projectId }, orderBy: { sort: "asc" } });
    const i = all.findIndex((x) => x.id === d.id);
    const j = action === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return json({ ok: true });
    [all[i], all[j]] = [all[j], all[i]];
    await prisma.$transaction(all.map((x, k) => prisma.design.update({ where: { id: x.id }, data: { sort: k } })));
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
