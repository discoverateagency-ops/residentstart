// npm run seed — wipes the database and inserts the demo data (docs/PRD.md "The demo project").
// The on-chain project is created from /admin → DAO → "Create project on-chain" (or `npm run seed -- --onchain`).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type TourRoom = { key: string; name: string; panorama: string; hotSpots: { pitch: number; yaw: number; text: string; sceneId: string }[] };

const ROOM_META: Record<string, { floor: number; size: number; yaw: number }> = {
  living: { floor: 1, size: 27, yaw: 0 },
  kitchen: { floor: 1, size: 14, yaw: 0 },
  master_bedroom: { floor: 2, size: 18, yaw: 0 },
  bathroom: { floor: 2, size: 5.2, yaw: 0 },
};

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set DEMO_PASSWORD (min 8 chars) before seeding");
  const hash = await bcrypt.hash(password, 10);

  // wipe (children first)
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
    prisma.room.deleteMany(),
    prisma.design.deleteMany(),
    prisma.project.deleteMany(),
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

  const project = await prisma.project.create({
    data: {
      slug: "cilandak-residence",
      name: "Residentstart Cilandak Residence",
      location: "Cilandak, Jakarta Selatan",
      type: "2-storey detached house",
      bedrooms: 3,
      bathrooms: 2,
      landM2: 120,
      buildingM2: 150,
      floors: 2,
      description:
        "A 2-storey detached family house in Cilandak, South Jakarta, near the TB Simatupang business corridor and the MRT Fatmawati–Cipete area. Three bedrooms, two bathrooms, an open living and dining area, a fitted kitchen and a roofed carport. Funded by investors through the Residentstart DAO on NEAR; buyers pay in rupiah, in cash or by DAO-financed installment.",
      listPriceIdr: BigInt(2_850_000_000),
      cashDiscountPct: 5,
      downPaymentPct: 20,
      annualRatePct: 8,
      tenorYears: [5, 10, 15],
      included: [
        "Fitted kitchen cabinets (lower + upper)",
        "Kitchen sink and tap",
        "Water heater in the master bathroom",
        "Bathroom fixtures",
        "Built-in wardrobe in the master bedroom",
        "Ceramic floor tiles, painted walls",
        "Window frames with glass, main door with lock",
        "Electricity 2,200 VA, clean water connection, septic tank",
        "Carport roof, fence and gate",
      ],
      notIncluded: [
        "Furniture",
        "Air conditioning units (wiring points prepared)",
        "Curtains",
        "Kitchen appliances (stove, fridge)",
        "Water pump upgrade",
        "Garden landscaping",
        "Smart-home devices",
      ],
      sharePriceNear: 10,
      totalShares: 200,
      status: "funding",
      published: true,
    },
  });

  await prisma.design.createMany({
    data: [
      { projectId: project.id, kind: "render", title: "Front view", imageUrl: "/designs/render_front.svg", sort: 0 },
      { projectId: project.id, kind: "floor_plan", title: "Floor plan · 1st floor", imageUrl: "/designs/floor_plan_1f.svg", sort: 1 },
      { projectId: project.id, kind: "floor_plan", title: "Floor plan · 2nd floor", imageUrl: "/designs/floor_plan_2f.svg", sort: 2 },
      { projectId: project.id, kind: "render", title: "Living room", imageUrl: "/designs/render_living.svg", sort: 3 },
    ],
  });

  const rooms = JSON.parse(readFileSync(join(process.cwd(), "public", "tour-sample", "rooms.json"), "utf8")) as TourRoom[];
  let sort = 0;
  for (const r of rooms) {
    const meta = ROOM_META[r.key] ?? { floor: 1, size: 0, yaw: 0 };
    await prisma.room.create({
      data: {
        projectId: project.id,
        key: r.key,
        name: r.name,
        floor: meta.floor,
        sizeM2: meta.size,
        panoramaUrl: `/tour-sample/${r.panorama}`,
        initialYaw: meta.yaw,
        hotspots: r.hotSpots.map((h) => ({ yaw: h.yaw, pitch: h.pitch, target_room_key: h.sceneId, label: h.text })),
        sort: sort++,
      },
    });
  }

  await prisma.marketingSite.createMany({
    data: [
      { key: "marketing_1", name: "Residentstart", url: "https://residentstart.com", purpose: "corporate", targetAudience: "Indonesian home buyers and investors researching the developer", language: "id+en" },
      { key: "marketing_2", name: "Cilandak Residence", url: "https://cilandak.residentstart.com", purpose: "project-listing", targetAudience: "Families looking for a house in South Jakarta", language: "id" },
      { key: "marketing_3", name: "Residentstart Invest", url: "https://invest.residentstart.com", purpose: "investor", targetAudience: "Crypto-native investors interested in real-world assets on NEAR", language: "en" },
    ],
  });

  console.log(`Seeded: 4 users, project ${project.slug}, 4 designs, ${rooms.length} rooms, 3 marketing sites.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
