import "server-only";
import type { Project } from "@prisma/client";
import { fromMonthly, unitsLeft, projectHref, tourHref } from "./project";

export type CardData = {
  slug: string; name: string; location: string; area: string; status: string; coverUrl: string; href: string; tourHref: string | null;
  priceIdr: number; fromMonthlyIdr: number; fromYears: number; bedrooms: number; bathrooms: number; landM2: number; buildingM2: number;
  certificate: string; unitsLeft: number; units: number; createdAt: string;
  // investor
  sharePriceNear: number; totalShares: number; sharesSold: number; onchain: boolean;
};

export async function toCards(ps: Project[]): Promise<CardData[]> {
  const left = await unitsLeft(ps.map((p) => p.id));
  return ps.map((p) => {
    const m = fromMonthly(p);
    return {
      slug: p.slug, name: p.name, location: p.location, area: p.area, status: p.status, coverUrl: p.coverUrl, href: projectHref(p),
      tourHref: p.tourSetId ? tourHref(p) : null, priceIdr: Number(p.listPriceIdr), fromMonthlyIdr: m.monthly, fromYears: m.years,
      bedrooms: p.bedrooms, bathrooms: p.bathrooms, landM2: p.landM2, buildingM2: p.buildingM2, certificate: p.certificate,
      unitsLeft: left[p.id] ?? p.units, units: p.units, createdAt: p.createdAt.toISOString(),
      sharePriceNear: p.sharePriceNear, totalShares: p.totalShares, sharesSold: p.sharesSold, onchain: !!p.onchainProjectId,
    };
  });
}
