import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Uploads a file to Supabase Storage (public bucket). Falls back to public/uploads for local dev without Supabase. */
export async function uploadFile(path: string, data: ArrayBuffer | Buffer, contentType: string): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "uploads";
  const safe = path.replace(/[^a-zA-Z0-9/_\-.]/g, "_");
  if (url && key) {
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${safe}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": contentType, "x-upsert": "true" },
      body: data instanceof Buffer ? new Uint8Array(data) : new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return `${url}/storage/v1/object/public/${bucket}/${safe}`;
  }
  const dir = join(process.cwd(), "public", "uploads", ...safe.split("/").slice(0, -1));
  await mkdir(dir, { recursive: true });
  await writeFile(join(process.cwd(), "public", "uploads", safe), Buffer.from(data as ArrayBuffer));
  return `/uploads/${safe}`;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
