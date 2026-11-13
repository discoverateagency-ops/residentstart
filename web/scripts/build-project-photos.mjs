// Builds photo sets for the four other projects from the Cilandak show-unit photos (same unit type),
// plus the investor hero and blog covers. Run once: node scripts/build-project-photos.mjs
// Replace any output with real photos later — keep the same file names.
import sharp from "sharp";
import { copyFileSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pub = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const src = (f) => join(pub, "projects", "cilandak-residence", f);
const meta = JSON.parse(readFileSync(src("photos.json"), "utf8"));
const alt = Object.fromEntries(meta.photos.map((p) => [p.url.split("/").pop(), p]));

const SETS = {
  "jagakarsa-townhouse": { cover: "living.jpg", photos: ["living.jpg", "kitchen-dining.jpg", "exterior-2.jpg", "master-bedroom-2.jpg", "bedroom-2.jpg", "bathroom-2.jpg"] },
  "cipete-garden-home": { cover: "exterior-2.jpg", photos: ["exterior-2.jpg", "dining.jpg", "kitchen.jpg", "master-bedroom.jpg", "bedroom-3.jpg", "bathroom-1.jpg"] },
  "bintaro-green-cluster": { cover: "kitchen-dining.jpg", photos: ["kitchen-dining.jpg", "exterior.jpg", "living-2.jpg", "stairs.jpg", "master-bedroom.jpg", "bathroom-2.jpg"] },
  "depok-hills-cluster": { cover: "master-bedroom-2.jpg", photos: ["master-bedroom-2.jpg", "exterior-2.jpg", "living.jpg", "dining.jpg", "bedroom-2.jpg", "kitchen.jpg"] },
};

async function cover(input, out, w = 1080, h = 720, position = "attention") {
  await sharp(input).resize(w, h, { fit: "cover", position }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
}

for (const [slug, set] of Object.entries(SETS)) {
  const dir = join(pub, "projects", slug);
  mkdirSync(dir, { recursive: true });
  await cover(src(set.cover), join(dir, "cover.jpg"));
  const photos = set.photos.map((f) => {
    copyFileSync(src(f), join(dir, f));
    const m = alt[f];
    return { kind: m.kind, url: `/projects/${slug}/${f}`, alt: `${m.alt} (show-unit reference)`, w: m.w, h: m.h };
  });
  writeFileSync(join(dir, "photos.json"), JSON.stringify({ slug, cover: `/projects/${slug}/cover.jpg`, photos, note: "Show-unit reference photos: same unit type as Cilandak Residence" }, null, 2));
}

// Investor hero (16:9) and blog covers (16:9)
await cover(src("exterior-2.jpg"), join(pub, "hero", "invest.jpg"), 1600, 900, "centre");
mkdirSync(join(pub, "blog"), { recursive: true });
const BLOG = {
  "cara-beli-rumah-tanpa-bank": "exterior.jpg",
  "virtual-tour-sebelum-beli": "living.jpg",
  "apa-itu-dao-properti": "kitchen-dining.jpg",
  "near-testnet-bukti-onchain": "master-bedroom-2.jpg",
  "jakarta-selatan-harga-rumah-2026": "exterior-2.jpg",
  "cicilan-5-10-15-tahun": "dining.jpg",
};
for (const [slug, f] of Object.entries(BLOG)) await cover(src(f), join(pub, "blog", `${slug}.jpg`), 1280, 720);
// Location tiles (square)
mkdirSync(join(pub, "areas"), { recursive: true });
const AREAS = { cilandak: "exterior.jpg", jagakarsa: "living.jpg", cipete: "exterior-2.jpg", "pondok-aren": "kitchen-dining.jpg", depok: "master-bedroom-2.jpg" };
for (const [a, f] of Object.entries(AREAS)) await cover(src(f), join(pub, "areas", `${a}.jpg`), 480, 480);
console.log("done");
