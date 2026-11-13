import { describe, expect, it } from "vitest";
import { apply, EMPTY } from "@/lib/filters";
import type { CardData } from "@/lib/cards";

const card = (slug: string, area: string, price: number, beds = 3): CardData => ({
  slug, name: slug, location: area, area, status: "funded", coverUrl: "", href: "", tourHref: "/t", priceIdr: price, fromMonthlyIdr: 1, fromYears: 15,
  bedrooms: beds, bathrooms: 2, landM2: 1, buildingM2: 1, certificate: "SHM", unitsLeft: 1, units: 1, createdAt: slug, sharePriceNear: 10, totalShares: 1, sharesSold: 0, onchain: false,
});
const cards = [card("cil", "Cilandak", 2.85e9), card("jag", "Jagakarsa", 1.95e9), card("cip", "Cipete", 3.6e9, 4)];

describe("filters", () => {
  it("L2: Cipete + > 3 M → Cipete only", () => expect(apply(cards, { ...EMPTY, areas: ["Cipete"], price: "gt3" }).map((c) => c.slug)).toEqual(["cip"]));
  it("Jagakarsa → one card", () => expect(apply(cards, { ...EMPTY, areas: ["Jagakarsa"] }).length).toBe(1));
  it("price bands", () => {
    expect(apply(cards, { ...EMPTY, price: "lt2" }).map((c) => c.slug)).toEqual(["jag"]);
    expect(apply(cards, { ...EMPTY, price: "2to3" }).map((c) => c.slug)).toEqual(["cil"]);
  });
  it("bedrooms 4+", () => expect(apply(cards, { ...EMPTY, beds: "4" }).map((c) => c.slug)).toEqual(["cip"]));
  it("sort by price", () => expect(apply(cards, { ...EMPTY, sort: "price_asc" }).map((c) => c.slug)).toEqual(["jag", "cil", "cip"]));
  it("recommended puts sold-out homes last", () => {
    const sold = { ...card("sold", "Cilandak", 1e9), unitsLeft: 0 };
    expect(apply([sold, ...cards], EMPTY).map((c) => c.slug)).toEqual(["cil", "jag", "cip", "sold"]);
  });
  it("no match → empty", () => expect(apply(cards, { ...EMPTY, areas: ["Depok"] })).toEqual([]));
});
