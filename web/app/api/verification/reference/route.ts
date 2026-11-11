import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { uploadFile, MAX_UPLOAD_BYTES } from "@/lib/storage";

function validDescriptor(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === 128 && d.every((x) => typeof x === "number" && Number.isFinite(x));
}

/** Reference photo (uploaded once at signup) + its descriptor computed in the browser. */
export async function POST(req: Request) {
  try {
    const user = await requireRole("buyer");
    const form = await req.formData();
    const photo = form.get("photo");
    const descriptor = JSON.parse(String(form.get("descriptor") || "null"));
    if (!(photo instanceof File)) return json({ error: "Reference photo is required" }, 400);
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return json({ error: "Photo must be JPEG, PNG or WebP" }, 400);
    if (photo.size > MAX_UPLOAD_BYTES) return json({ error: "Photo is too large (max 8 MB)" }, 400);
    if (!validDescriptor(descriptor)) return json({ error: "No face found in the photo. Use a clear, front-facing photo." }, 400);
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const url = await uploadFile(`reference/${user.id}/${randomUUID()}.${ext}`, await photo.arrayBuffer(), photo.type);
    const existing = await prisma.verification.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (existing && !existing.verified) {
      await prisma.verification.update({ where: { id: existing.id }, data: { referencePhotoUrl: url, descriptor, failedAttempts: 0 } });
    } else if (!existing) {
      await prisma.verification.create({ data: { userId: user.id, referencePhotoUrl: url, descriptor, verified: false } });
    } else {
      return json({ error: "Already verified" }, 409);
    }
    return json({ ok: true, referencePhotoUrl: url });
  } catch (e) {
    return handleError(e);
  }
}
