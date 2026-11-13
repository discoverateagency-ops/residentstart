import { randomUUID } from "crypto";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { uploadFile, MAX_UPLOAD_BYTES } from "@/lib/storage";

/** Admin image upload (cover / gallery photos). Returns a public URL. */
export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Choose an image" }, 400);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return json({ error: "Image must be JPEG, PNG or WebP (photos only)" }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return json({ error: "Max 8 MB" }, 400);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const url = await uploadFile(`projects/${randomUUID()}.${ext}`, await file.arrayBuffer(), file.type);
    return json({ ok: true, url });
  } catch (e) {
    return handleError(e);
  }
}
