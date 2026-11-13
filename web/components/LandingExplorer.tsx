"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CardData } from "@/lib/cards";
import { apply, AREAS, EMPTY, isFiltered, PRICE_LABEL, type Filters, type PriceBand } from "@/lib/filters";
import { HomeCard } from "./HomeCard";

export function LandingExplorer({ cards }: { cards: CardData[] }) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [f, setF] = useState<Filters>(EMPTY);
  const gridRef = useRef<HTMLElement>(null);
  const shown = apply(cards, f);
  const scroll = () => setTimeout(() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);

  useEffect(() => {
    const on = (e: Event) => {
      const area = (e as CustomEvent<string>).detail;
      const next = { ...EMPTY, areas: [area] };
      setDraft(next);
      setF(next);
      scroll();
    };
    window.addEventListener("rs-area", on);
    return () => window.removeEventListener("rs-area", on);
  }, []);

  const search = (e: React.FormEvent) => { e.preventDefault(); setF(draft); scroll(); };
  const chip = (patch: Partial<Filters>) => { const next = { ...f, ...patch }; setDraft(next); setF(next); scroll(); };
  const clear = () => { setDraft(EMPTY); setF(EMPTY); };

  return (
    <>
      <section className="relative">
        <div className="relative h-[420px] md:h-[480px] w-full overflow-hidden">
          <Image src="/hero/home.jpg" alt="Residentstart show unit, front facade with carport" fill priority sizes="100vw" className="object-cover object-[center_75%]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/40 to-black/5" />
          <div className="container-rs relative flex h-full flex-col justify-end pb-8 md:pb-12">
            <h1 className="max-w-2xl text-[28px] leading-[34px] text-white md:text-[36px] md:leading-[44px]">Find a home in South Jakarta you can actually afford.</h1>
            <p className="mt-2 max-w-xl text-[15px] text-white/90 md:text-base">New houses from Residentstart, DAO-financed installments up to 15 years, no bank needed.</p>
            <form onSubmit={search} className="mt-5 grid w-full max-w-3xl grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-lg md:grid-cols-[1.3fr_1fr_1fr_auto]" role="search" aria-label="Search homes">
              <label className="col-span-2 md:col-span-1">
                <span className="sr-only">Location</span>
                <select className="input py-2.5 text-[15px]" value={draft.areas[0] ?? ""} onChange={(e) => setDraft({ ...draft, areas: e.target.value ? [e.target.value] : [] })}>
                  <option value="">All locations</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Price</span>
                <select className="input py-2.5 text-[15px]" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value as PriceBand })}>
                  {(Object.keys(PRICE_LABEL) as PriceBand[]).map((k) => <option key={k} value={k}>{PRICE_LABEL[k]}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Bedrooms</span>
                <select className="input py-2.5 text-[15px]" value={draft.beds} onChange={(e) => setDraft({ ...draft, beds: e.target.value as Filters["beds"] })}>
                  <option value="any">Any bedrooms</option>
                  <option value="3">3 KT</option>
                  <option value="4">4+ KT</option>
                </select>
              </label>
              <button className="btn-primary col-span-2 min-h-11 md:col-span-1">Search</button>
            </form>
          </div>
        </div>
      </section>

      <div className="container-rs mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Quick filters">
        {AREAS.map((a) => (
          <button key={a} onClick={() => chip({ areas: f.areas[0] === a ? [] : [a] })} aria-pressed={f.areas.includes(a)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${f.areas.includes(a) ? "border-rs-green-700 bg-rs-green-700 text-white" : "border-rs-border bg-white text-rs-ink hover:border-rs-green-500"}`}>{a}</button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-rs-border" aria-hidden />
        {(["lt2", "2to3", "gt3"] as PriceBand[]).map((k) => (
          <button key={k} onClick={() => chip({ price: f.price === k ? "any" : k })} aria-pressed={f.price === k} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${f.price === k ? "border-rs-green-700 bg-rs-green-700 text-white" : "border-rs-border bg-white text-rs-ink hover:border-rs-green-500"}`}>{PRICE_LABEL[k]}</button>
        ))}
      </div>

      <section ref={gridRef} id="homes" className="container-rs scroll-mt-20 pt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl">Homes ready to buy</h2>
            <p className="text-sm text-rs-ink/60">{shown.length} {shown.length === 1 ? "home" : "homes"}{isFiltered(f) ? " match your search" : " from Residentstart"}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isFiltered(f) && <button onClick={clear} className="font-semibold text-rs-green-700 underline">Clear filters</button>}
            <Link href="/buy" className="font-semibold text-rs-green-700">See all →</Link>
          </div>
        </div>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rs-border p-8 text-center">
            <p className="font-medium">No homes match. <button onClick={clear} className="text-rs-green-700 underline">Clear filters</button></p>
            {f.areas.some((a) => a === "Pondok Aren" || a === "Depok") && (
              <p className="mt-2 text-sm text-rs-ink/70">Projects in {f.areas.join(", ")} are still open for funding. <Link href="/invest" className="font-semibold text-rs-green-700">See For Investor →</Link></p>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c, i) => <HomeCard key={c.slug} c={c} priority={i < 3} />)}
          </div>
        )}
      </section>
    </>
  );
}
