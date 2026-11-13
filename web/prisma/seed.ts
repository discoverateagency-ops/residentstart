// npm run seed — wipes the database and inserts the demo data (docs/PRD.md + docs/PRD-2.md "Seed").
// Five projects, one tour set, six blog posts (web/content/blog/*.md), three demo testimonials, three marketing sites.
// When NEAR_ADMIN_KEY is set, the two `funding` projects are created on-chain (dao.create_project); pass --no-chain to skip.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Near, keyStores, providers, transactions } from "near-api-js";
import { sendTx } from "../lib/near-tx";

const prisma = new PrismaClient();
const PUB = join(process.cwd(), "public");
const TOUR_ID = "cilandak-residence-walkthrough";

type Photo = { kind: string; url: string; alt: string };
const photosOf = (slug: string): Photo[] =>
  (JSON.parse(readFileSync(join(PUB, "projects", slug, "photos.json"), "utf8")).photos as Photo[]).map(({ kind, url, alt }) => ({ kind, url, alt }));
const FLOORPLANS = [`/tours/${TOUR_ID}/floorplan-gf.png`, `/tours/${TOUR_ID}/floorplan-1f.png`];

const cil = JSON.parse(readFileSync(join(PUB, "projects", "cilandak-residence", "project.json"), "utf8"));

type Seed = {
  slug: string; name: string; area: string; location: string; type: string; status: string;
  bedrooms: number; bathrooms: number; landM2: number; buildingM2: number; floors: number; listPriceIdr: number;
  units: number; certificate: string; totalShares: number; description: string; descriptionLong: string;
  nearby: { name: string; kind: string; distance_km: number }[]; sortOrder: number;
};

const PROJECTS: Seed[] = [
  {
    slug: "cilandak-residence", name: "Residentstart Cilandak Residence", area: "Cilandak", location: "Cilandak, Jakarta Selatan",
    type: "2-storey cluster house (townhouse row)", status: "funded", bedrooms: 3, bathrooms: 2, landM2: 72, buildingM2: 90, floors: 2,
    listPriceIdr: 2_850_000_000, units: 1, certificate: "SHM", totalShares: 200, sortOrder: 1,
    description: "A finished two-storey cluster house in Cilandak with an open-plan ground floor, three bedrooms and a roofed carport.",
    descriptionLong: cil.description_long,
    nearby: cil.nearby,
  },
  {
    slug: "jagakarsa-townhouse", name: "Residentstart Jagakarsa Townhouse", area: "Jagakarsa", location: "Jagakarsa, Jakarta Selatan",
    type: "2-storey townhouse", status: "completed", bedrooms: 3, bathrooms: 2, landM2: 90, buildingM2: 110, floors: 2,
    listPriceIdr: 1_950_000_000, units: 2, certificate: "SHM", totalShares: 200, sortOrder: 2,
    description: "A completed two-storey townhouse in Jagakarsa, built to the same unit type as the Cilandak show unit, ready to move in.",
    descriptionLong:
      "A completed two-storey townhouse in a small gated row in Jagakarsa, South Jakarta. It follows the same unit type as the Cilandak show unit on a wider 90 m² lot, which gives a deeper living room and a larger rear yard. The ground floor has the living room, dining area and a fitted kitchen with upper and lower cabinets, a third bedroom that can serve as a study, a bathroom and a service yard. Upstairs are the master bedroom with a built-in wardrobe, a second bedroom and a second bathroom with a water heater. A roofed carport takes one car. Two units remain in this row and both are ready for handover. Photos and the walkthrough show the Cilandak show unit as a reference for the layout and finishes; furniture is not included. Specifications are indicative for this demo and may differ from the final unit.",
    nearby: [
      { name: "Toll road access", kind: "transport", distance_km: 2.4 },
      { name: "Primary and secondary schools", kind: "school", distance_km: 1.1 },
      { name: "Shopping mall", kind: "mall", distance_km: 3.2 },
      { name: "Hospital", kind: "hospital", distance_km: 2.8 },
    ],
  },
  {
    slug: "cipete-garden-home", name: "Residentstart Cipete Garden Home", area: "Cipete", location: "Cipete, Jakarta Selatan",
    type: "2-storey detached house with garden", status: "in_construction", bedrooms: 4, bathrooms: 3, landM2: 150, buildingM2: 180, floors: 2,
    listPriceIdr: 3_600_000_000, units: 3, certificate: "SHM", totalShares: 200, sortOrder: 3,
    description: "A four-bedroom detached house with a garden in Cipete, currently in construction; installments can be confirmed now.",
    descriptionLong:
      "A detached two-storey house with a front garden on a 150 m² lot in Cipete, South Jakarta, currently in construction. The plan extends the Cilandak unit type with a fourth bedroom and a third bathroom: the ground floor holds the living room, dining area, a fitted kitchen, a guest bedroom with its own bathroom and a service yard; upstairs are the master bedroom with an en-suite bathroom, two further bedrooms and a shared bathroom. The carport takes one car and the garden runs along the front. Three units are planned. Buyers can confirm cash or a DAO-financed installment now and follow construction until handover. Photos and the walkthrough show the Cilandak show unit as a reference for finishes and room proportions; the built house will be larger. Specifications are indicative for this demo and may differ from the final unit.",
    nearby: [
      { name: "MRT Cipete Raya", kind: "transport", distance_km: 0.9 },
      { name: "International school", kind: "school", distance_km: 1.6 },
      { name: "Shopping mall", kind: "mall", distance_km: 1.3 },
      { name: "Hospital", kind: "hospital", distance_km: 1.9 },
    ],
  },
  {
    slug: "bintaro-green-cluster", name: "Residentstart Bintaro Green Cluster", area: "Pondok Aren", location: "Pondok Aren, Tangerang Selatan",
    type: "2-storey cluster house", status: "funding", bedrooms: 3, bathrooms: 2, landM2: 105, buildingM2: 130, floors: 2,
    listPriceIdr: 2_400_000_000, units: 2, certificate: "SHM", totalShares: 300, sortOrder: 4,
    description: "A two-unit cluster in Pondok Aren, open for funding through the Residentstart DAO: 300 shares at 10 NEAR.",
    descriptionLong:
      "A planned cluster of two houses in Pondok Aren, South Tangerang, near the Bintaro business district. Each unit is a two-storey house on a 105 m² lot with 130 m² of building area, three bedrooms and two bathrooms, following the Cilandak unit type with a larger living and dining area. The project is open for funding on the Residentstart DAO: 300 shares at 10 NEAR each, a target of 3,000 NEAR on testnet. Share holders vote on the funding proposal; if it passes, construction can start and the finished homes go on sale to buyers at a planned price of Rp 2.400.000.000 per unit, with cash or DAO-financed installments over 5, 10 or 15 years. Photos and the walkthrough are a design reference from the Cilandak show unit; the built units may differ. This is a testnet demo: no returns are promised and testnet NEAR has no value.",
    nearby: [
      { name: "Commuter line station", kind: "transport", distance_km: 1.7 },
      { name: "International school", kind: "school", distance_km: 2.2 },
      { name: "Shopping mall", kind: "mall", distance_km: 2.0 },
      { name: "Hospital", kind: "hospital", distance_km: 3.1 },
    ],
  },
  {
    slug: "depok-hills-cluster", name: "Residentstart Depok Hills Cluster", area: "Depok", location: "Cimanggis, Depok",
    type: "2-storey cluster house", status: "funding", bedrooms: 3, bathrooms: 2, landM2: 84, buildingM2: 100, floors: 2,
    listPriceIdr: 1_750_000_000, units: 2, certificate: "SHM", totalShares: 250, sortOrder: 5,
    description: "A two-unit cluster in Cimanggis, Depok, open for funding through the Residentstart DAO: 250 shares at 10 NEAR.",
    descriptionLong:
      "A planned cluster of two houses in Cimanggis, Depok, close to the toll road to South Jakarta. Each unit is a two-storey house on an 84 m² lot with 100 m² of building area, three bedrooms and two bathrooms, using the same unit type as the Cilandak show unit: open-plan living and dining with a fitted kitchen downstairs, two bedrooms and a bathroom upstairs, and a ground-floor bedroom that can serve as a study. The project is open for funding on the Residentstart DAO: 250 shares at 10 NEAR each, a target of 2,500 NEAR on testnet. If share holders approve the funding proposal, construction can start and the homes go on sale at a planned price of Rp 1.750.000.000 per unit, with cash or DAO-financed installments. Photos and the walkthrough are a design reference; the built units may differ. This is a testnet demo: no returns are promised.",
    nearby: [
      { name: "Toll gate", kind: "transport", distance_km: 1.5 },
      { name: "Primary school", kind: "school", distance_km: 0.8 },
      { name: "Shopping mall", kind: "mall", distance_km: 2.6 },
      { name: "Hospital", kind: "hospital", distance_km: 2.9 },
    ],
  },
];

const TESTIMONIALS = [
  { name: "Rina A.", role: "First-time buyer, Cilandak", quote: "I could walk through every room on my phone before visiting, and the monthly amount was clear from day one." },
  { name: "Budi S.", role: "Young family, Jagakarsa", quote: "No bank appointment. I picked a 15-year tenor and every payment shows up with a receipt I can check." },
  { name: "Citra W.", role: "Investor, testnet DAO", quote: "I like that repayments are visible on NearBlocks instead of in a PDF report once a quarter." },
];

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter");
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: m[2].trim() };
}

function loadPosts() {
  const dir = join(process.cwd(), "content", "blog");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { meta, body } = parseFrontmatter(readFileSync(join(dir, f), "utf8"));
      const words = body.split(/\s+/).filter(Boolean).length;
      return {
        slug: meta.slug || f.replace(/\.md$/, ""),
        title: meta.title,
        excerpt: meta.excerpt,
        category: meta.category,
        coverUrl: meta.cover || `/blog/${meta.slug}.jpg`,
        authorName: meta.author || "Residentstart Team",
        authorRole: meta.authorRole || "Editorial",
        publishedAt: new Date(`${meta.date}T08:00:00+07:00`),
        readMinutes: Number(meta.readMinutes) || Math.max(1, Math.ceil(words / 200)),
        bodyMd: body,
        published: true,
        relatedSlugs: (meta.related || "").replace(/[[\]]/g, "").split(",").map((s) => s.trim()).filter(Boolean),
      };
    });
}

async function createOnChain(projects: { id: string; slug: string; name: string; sharePriceNear: number; totalShares: number }[]) {
  const key = process.env.NEAR_ADMIN_KEY;
  const admin = process.env.NEAR_ADMIN_ACCOUNT;
  const dao = process.env.NEAR_DAO_CONTRACT || "dao.residentstart.testnet";
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const Y = BigInt("1000000000000000000000000");
  if (!key || !admin || process.argv.includes("--no-chain")) {
    for (const p of projects) {
      console.log(`On-chain skipped. Create it from /admin → DAO, or run:\n  near contract call-function as-transaction ${dao} create_project json-args '{"project_id":"${p.slug}-${stamp}","name":"${p.name}","share_price_yocto":"${(BigInt(p.sharePriceNear) * Y).toString()}","total_shares":${p.totalShares}}' prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as ${admin ?? "residentstart.testnet"} network-config testnet sign-with-legacy-keychain send`);
    }
    return;
  }
  const network = process.env.NEAR_NETWORK || "testnet";
  const ks = new keyStores.InMemoryKeyStore();
  const near = new Near({ networkId: network, nodeUrl: process.env.NEAR_RPC_URL || "https://test.rpc.fastnear.com", keyStore: ks });
  const provider = near.connection.provider as providers.JsonRpcProvider;
  for (const p of projects) {
    const id = `${p.slug}-${stamp}`;
    const args = { project_id: id, name: p.name, share_price_yocto: (BigInt(p.sharePriceNear) * Y).toString(), total_shares: p.totalShares };
    const out = await sendTx({ provider, network, accountId: admin, privateKey: key, receiverId: dao, actions: [transactions.functionCall("create_project", Buffer.from(JSON.stringify(args)), BigInt("30000000000000"), BigInt(0))] });
    const failed = JSON.stringify(out.status).includes("Failure");
    if (failed) throw new Error(`create_project failed for ${id}: ${JSON.stringify(out.status)}`);
    await prisma.project.update({ where: { id: p.id }, data: { onchainProjectId: id, sharesSold: 0 } });
    console.log(`On-chain: ${id} (tx ${out.transaction.hash})`);
  }
}

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set DEMO_PASSWORD (min 8 chars) before seeding");
  const hash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.agentMessage.deleteMany(),
    prisma.marketingReport.deleteMany(),
    prisma.marketingSite.deleteMany(),
    prisma.paymentEvent.deleteMany(),
    prisma.repaymentReceipt.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.schedulePeriod.deleteMany(),
    prisma.loan.deleteMany(),
    prisma.vote.deleteMany(),
    prisma.proposal.deleteMany(),
    prisma.investment.deleteMany(),
    prisma.verification.deleteMany(),
    prisma.project.deleteMany(),
    prisma.tourSet.deleteMany(),
    prisma.blogPost.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await prisma.user.createMany({
    data: [
      { email: "admin@residentstart.demo", passwordHash: hash, role: "admin", displayName: "Admin", nearAccountId: process.env.NEAR_ADMIN_ACCOUNT || "residentstart.testnet" },
      { email: "investor1@residentstart.demo", passwordHash: hash, role: "investor", displayName: "Investor One", nearAccountId: process.env.NEAR_INVESTOR1_ACCOUNT || "investor1.residentstart.testnet" },
      { email: "investor2@residentstart.demo", passwordHash: hash, role: "investor", displayName: "Investor Two", nearAccountId: process.env.NEAR_INVESTOR2_ACCOUNT || "investor2.residentstart.testnet" },
      { email: "buyer1@residentstart.demo", passwordHash: hash, role: "buyer", displayName: "Buyer One", nearAccountId: null },
    ],
  });

  const config = JSON.parse(readFileSync(join(PUB, "tours", TOUR_ID, "rooms.json"), "utf8"));
  await prisma.tourSet.create({ data: { id: TOUR_ID, name: "Cilandak Residence show unit", mode: config.mode || "photo-walkthrough", basePath: `/tours/${TOUR_ID}/`, config } });

  const created = [];
  for (const s of PROJECTS) {
    const photos = photosOf(s.slug);
    const p = await prisma.project.create({
      data: {
        slug: s.slug, name: s.name, area: s.area, location: s.location, type: s.type, status: s.status,
        bedrooms: s.bedrooms, bathrooms: s.bathrooms, landM2: s.landM2, buildingM2: s.buildingM2, floors: s.floors,
        description: s.description, descriptionLong: s.descriptionLong,
        listPriceIdr: BigInt(s.listPriceIdr), cashDiscountPct: 5, downPaymentPct: 20, annualRatePct: 8, tenorYears: [5, 10, 15],
        included: cil.included, notIncluded: cil.not_included, roomsSpec: cil.rooms,
        sharePriceNear: 10, totalShares: s.totalShares, sharesSold: 0, published: true,
        coverUrl: `/projects/${s.slug}/cover.jpg`, photos, floorplans: FLOORPLANS, tourSetId: TOUR_ID,
        units: s.units, certificate: s.certificate, nearby: s.nearby, sortOrder: s.sortOrder,
      },
    });
    created.push(p);
  }

  const posts = loadPosts();
  if (posts.length) await prisma.blogPost.createMany({ data: posts });
  await prisma.testimonial.createMany({ data: TESTIMONIALS.map((t, i) => ({ ...t, isDemo: true, sort: i })) });

  await prisma.marketingSite.createMany({
    data: [
      { key: "marketing_1", name: "Residentstart", url: "https://residentstart.com", purpose: "corporate", targetAudience: "Indonesian home buyers and investors researching the developer", language: "id+en" },
      { key: "marketing_2", name: "Cilandak Residence", url: "https://cilandak.residentstart.com", purpose: "project-listing", targetAudience: "Families looking for a house in South Jakarta", language: "id" },
      { key: "marketing_3", name: "Residentstart Invest", url: "https://invest.residentstart.com", purpose: "investor", targetAudience: "Crypto-native investors interested in real-world assets on NEAR", language: "en" },
    ],
  });

  console.log(`Seeded: 4 users, ${created.length} projects, 1 tour set, ${posts.length} blog posts, ${TESTIMONIALS.length} testimonials, 3 marketing sites.`);
  await createOnChain(created.filter((p) => p.status === "funding"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
