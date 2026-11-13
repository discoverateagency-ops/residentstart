import Link from "next/link";
import Image from "next/image";
import type { CardData } from "@/lib/cards";
import { idrShort } from "@/lib/format";

const STATUS_BADGE: Record<string, string> = { completed: "Siap huni", in_construction: "Dalam pembangunan", funded: "Funded · siap dipesan" };

export function SpecRow({ c, className = "" }: { c: Pick<CardData, "bedrooms" | "bathrooms" | "landM2" | "buildingM2" | "certificate">; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-rs-ink/80 tabular ${className}`}>
      <span>KT {c.bedrooms}</span><span aria-hidden>·</span><span>KM {c.bathrooms}</span><span aria-hidden>·</span>
      <span>LT {c.landM2} m²</span><span aria-hidden>·</span><span>LB {c.buildingM2} m²</span>
      <span className="ml-1 rounded bg-[#F2F4F3] px-1.5 py-0.5 text-[11px] font-semibold text-rs-ink/70">{c.certificate}</span>
    </div>
  );
}

/** Buyer-portal card (Pinhome-style density). */
export function HomeCard({ c, priority = false }: { c: CardData; priority?: boolean }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-rs-border bg-white transition-shadow hover:shadow-[0_6px_24px_rgba(22,59,53,0.10)]">
      <Link href={c.href} className="relative block aspect-[3/2] overflow-hidden bg-rs-green-100" aria-label={c.name}>
        <Image src={c.coverUrl} alt={`${c.name} — photo`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" priority={priority} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {STATUS_BADGE[c.status] && <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-rs-green-900 shadow-sm">{STATUS_BADGE[c.status]}</span>}
          {c.unitsLeft > 0 && c.unitsLeft <= 3 && <span className="rounded-md bg-[#B54708] px-2 py-1 text-[11px] font-semibold text-white">Sisa {c.unitsLeft} unit</span>}
          {c.unitsLeft === 0 && <span className="rounded-md bg-rs-ink/80 px-2 py-1 text-[11px] font-semibold text-white">Terjual</span>}
        </div>
        {c.tourHref && <span className="absolute bottom-3 right-3 rounded-md bg-rs-green-900/85 px-2 py-1 text-[11px] font-semibold text-white">◎ Tur 360°</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-lg font-semibold text-rs-green-900 tabular">{idrShort(c.priceIdr)}</p>
        <p className="text-[13px] text-rs-ink/70 tabular">Cicilan mulai <strong className="text-rs-green-700">{idrShort(c.fromMonthlyIdr)}/bln</strong> ({c.fromYears} thn)</p>
        <h3 className="mt-1 text-[15px] leading-snug line-clamp-2"><Link href={c.href} className="hover:underline">{c.name}</Link></h3>
        <p className="text-[13px] text-rs-ink/60">{c.location}</p>
        <SpecRow c={c} className="mt-1" />
        <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-3">
          <Link href={c.href} className="btn-primary btn-sm min-h-10">View home</Link>
          {c.tourHref && <Link href={c.tourHref} className="btn-secondary btn-sm min-h-10" aria-label={`360° tour of ${c.name}`}>360°</Link>}
        </div>
      </div>
    </article>
  );
}

/** Investor card variant: shares, price per share, funded %, target. */
export function InvestCard({ c }: { c: CardData }) {
  const pct = c.totalShares ? (c.sharesSold / c.totalShares) * 100 : 0;
  const target = c.totalShares * c.sharePriceNear;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-rs-border bg-white">
      <Link href={c.href} className="relative block aspect-[16/9] bg-rs-green-100" aria-label={c.name}>
        <Image src={c.coverUrl} alt={`${c.name} — design reference photo`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
        <span className="absolute left-3 top-3 rounded-md bg-[#FEF0C7] px-2 py-1 text-[11px] font-semibold text-[#B54708]">Funding</span>
        {c.tourHref && <span className="absolute bottom-3 right-3 rounded-md bg-rs-green-900/85 px-2 py-1 text-[11px] font-semibold text-white">◎ 360° preview</span>}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-base"><Link href={c.href} className="hover:underline">{c.name}</Link></h3>
        <p className="text-[13px] text-rs-ink/60">{c.location} · {c.units} units · KT {c.bedrooms} KM {c.bathrooms}</p>
        <div className="mt-1 flex items-baseline justify-between tabular">
          <span className="text-lg font-semibold text-rs-green-900">{c.sharePriceNear} NEAR <span className="text-sm font-normal text-rs-ink/60">/ share</span></span>
          <span className="text-sm font-semibold">{new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(pct)} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-rs-green-100" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-rs-green-700" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="text-[13px] text-rs-ink/70 tabular">{c.sharesSold} / {c.totalShares} shares · target {new Intl.NumberFormat("id-ID").format(target)} NEAR</p>
        <p className="text-[13px] text-rs-ink/70">Planned buyer price {idrShort(c.priceIdr)} / unit</p>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <Link href={c.href} className="btn-primary btn-sm min-h-10">View project</Link>
          {c.tourHref && <Link href={c.tourHref} className="btn-secondary btn-sm min-h-10">360° preview</Link>}
        </div>
      </div>
    </article>
  );
}
