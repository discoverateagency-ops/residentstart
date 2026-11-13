"use client";
import Link from "next/link";
import { useState } from "react";
import type { CardData } from "@/lib/cards";
import { apply, AREAS, EMPTY, isFiltered, PRICE_LABEL, type Filters, type PriceBand } from "@/lib/filters";
import { HomeCard } from "./HomeCard";

export function BuyExplorer({ cards }: { cards: CardData[] }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [open, setOpen] = useState(false);
  const shown = apply(cards, f);
  const toggleArea = (a: string) => setF({ ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a] });

  const panel = (
    <div className="flex flex-col gap-6 text-[14px]">
      <fieldset>
        <legend className="mb-2 font-semibold text-rs-green-900">Location</legend>
        {AREAS.map((a) => (
          <label key={a} className="flex items-center gap-2 py-1"><input type="checkbox" className="h-4 w-4 accent-[#1E4D45]" checked={f.areas.includes(a)} onChange={() => toggleArea(a)} /> {a}</label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-semibold text-rs-green-900">Price</legend>
        {(Object.keys(PRICE_LABEL) as PriceBand[]).map((k) => (
          <label key={k} className="flex items-center gap-2 py-1"><input type="radio" name="price" className="h-4 w-4 accent-[#1E4D45]" checked={f.price === k} onChange={() => setF({ ...f, price: k })} /> {PRICE_LABEL[k]}</label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-semibold text-rs-green-900">Bedrooms</legend>
        <div className="flex gap-2">
          {([["any", "Any"], ["3", "3"], ["4", "4+"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setF({ ...f, beds: k })} aria-pressed={f.beds === k} className={`rounded-lg border px-3 py-1.5 ${f.beds === k ? "border-rs-green-700 bg-rs-green-700 text-white" : "border-rs-border"}`}>{l}</button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center justify-between gap-2">
        <span className="font-semibold text-rs-green-900">Has 360° tour</span>
        <input type="checkbox" role="switch" className="h-5 w-5 accent-[#1E4D45]" checked={f.tourOnly} onChange={(e) => setF({ ...f, tourOnly: e.target.checked })} />
      </label>
      {isFiltered(f) && <button type="button" onClick={() => setF({ ...EMPTY, sort: f.sort })} className="self-start font-semibold text-rs-green-700 underline">Clear filters</button>}
    </div>
  );

  return (
    <div className="grid gap-8 md:grid-cols-[280px_1fr]">
      <aside className="hidden md:block">
        <div className="sticky top-24 rounded-2xl border border-rs-border p-5">{panel}</div>
      </aside>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button className="btn-secondary btn-sm md:hidden" onClick={() => setOpen(true)}>Filters{isFiltered(f) ? " •" : ""}</button>
          <p className="text-sm text-rs-ink/60">{shown.length} of {cards.length} homes</p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-rs-ink/60">Sort</span>
            <select className="input w-auto py-2 text-sm" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as Filters["sort"] })}>
              <option value="relevance">Recommended</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rs-border p-8 text-center">
            <p className="font-medium">No homes match. <button onClick={() => setF(EMPTY)} className="text-rs-green-700 underline">Clear filters</button></p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">{shown.map((c, i) => <HomeCard key={c.slug} c={c} priority={i < 2} />)}</div>
        )}
        <div className="mt-10 rounded-2xl border border-rs-border bg-rs-bg p-5 text-[15px]">
          Looking to invest instead? <Link href="/invest" className="font-semibold text-rs-green-700">For Investor →</Link>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setOpen(false)} role="dialog" aria-modal aria-label="Filters">
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-y-auto bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg">Filters</h2><button onClick={() => setOpen(false)} aria-label="Close filters" className="text-2xl leading-none">×</button></div>
            {panel}
            <button className="btn-primary mt-6 w-full" onClick={() => setOpen(false)}>Show {shown.length} homes</button>
          </div>
        </div>
      )}
    </div>
  );
}
