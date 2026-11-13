// Client-safe filtering for the buyer portal (PRD-2: search filters the seeded list client-side).
import type { CardData } from "./cards";

export type PriceBand = "any" | "lt2" | "2to3" | "gt3";
export type Filters = { areas: string[]; price: PriceBand; beds: "any" | "3" | "4"; tourOnly: boolean; sort: "relevance" | "price_asc" | "price_desc" | "newest" };
export const EMPTY: Filters = { areas: [], price: "any", beds: "any", tourOnly: false, sort: "relevance" };
export const AREAS = ["Cilandak", "Jagakarsa", "Cipete", "Pondok Aren", "Depok"];
export const PRICE_LABEL: Record<PriceBand, string> = { any: "Any price", lt2: "< 2 M", "2to3": "2–3 M", gt3: "> 3 M" };

export function matches(c: CardData, f: Filters): boolean {
  if (f.areas.length && !f.areas.includes(c.area)) return false;
  const b = c.priceIdr / 1e9;
  if (f.price === "lt2" && !(b < 2)) return false;
  if (f.price === "2to3" && !(b >= 2 && b <= 3)) return false;
  if (f.price === "gt3" && !(b > 3)) return false;
  if (f.beds === "3" && c.bedrooms !== 3) return false;
  if (f.beds === "4" && c.bedrooms < 4) return false;
  if (f.tourOnly && !c.tourHref) return false;
  return true;
}

export function apply(cards: CardData[], f: Filters): CardData[] {
  const out = cards.filter((c) => matches(c, f));
  // recommended: available homes first, sold-out last (stable)
  if (f.sort === "relevance") out.sort((a, b) => Number(a.unitsLeft === 0) - Number(b.unitsLeft === 0));
  if (f.sort === "price_asc") out.sort((a, b) => a.priceIdr - b.priceIdr);
  if (f.sort === "price_desc") out.sort((a, b) => b.priceIdr - a.priceIdr);
  if (f.sort === "newest") out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

export const isFiltered = (f: Filters) => f.areas.length > 0 || f.price !== "any" || f.beds !== "any" || f.tourOnly;

/** Other components (location tiles) ask the explorer to filter + scroll. */
export function requestAreaFilter(area: string) {
  window.dispatchEvent(new CustomEvent("rs-area", { detail: area }));
}
