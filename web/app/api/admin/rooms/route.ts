import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { uploadFile, MAX_UPLOAD_BYTES } from "@/lib/storage";

const Hotspots = z.array(
  z.object({ yaw: z.number().min(-360).max(360), pitch: z.number().min(-90).max(90), target_room_key: z.string().min(1), label: z.string().min(1).max(60) }).strict(),
);

/** JSON {id, initialYaw, hotspots} or multipart {id, panorama} */
export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const id = String(form.get("id") || "");
      const file = form.get("panorama");
      const room = await prisma.room.findUnique({ where: { id } });
      if (!room) return json({ error: "Room not found" }, 404);
      if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return json({ error: "Panorama must be a JPEG/PNG/WebP image" }, 400);
      if (file.size > MAX_UPLOAD_BYTES) return json({ error: "Max 8 MB (keep panoramas ≤ 1.5 MB for 4G)" }, 400);
      const url = await uploadFile(`panoramas/${room.key}-${randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`, await file.arrayBuffer(), file.type);
      await prisma.room.update({ where: { id }, data: { panoramaUrl: url } });
      return json({ ok: true, panoramaUrl: url });
    }
    const { id, initialYaw, hotspots } = (await req.json()) as { id?: string; initialYaw?: number; hotspots?: unknown };
    const room = id ? await prisma.room.findUnique({ where: { id } }) : null;
    if (!room) return json({ error: "Room not found" }, 404);
    const parsed = Hotspots.safeParse(hotspots);
    if (!parsed.success) return json({ error: `Invalid hotspots: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}` }, 400);
    const keys = new Set((await prisma.room.findMany({ where: { projectId: room.projectId }, select: { key: true } })).map((r) => r.key));
    const bad = parsed.data.find((h) => !keys.has(h.target_room_key));
    if (bad) return json({ error: `Unknown target_room_key "${bad.target_room_key}". Valid: ${[...keys].join(", ")}` }, 400);
    const yaw = Number(initialYaw ?? 0);
    if (!Number.isFinite(yaw) || yaw < -180 || yaw > 180) return json({ error: "initial_yaw must be between -180 and 180" }, 400);
    await prisma.room.update({ where: { id: room.id }, data: { initialYaw: yaw, hotspots: parsed.data } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
