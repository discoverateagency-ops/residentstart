"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type P = { url: string; alt: string };

export function PhotoGallery({ photos, tourHref, tourButton }: { photos: P[]; tourHref: string | null; tourButton: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const n = photos.length;
  const prev = useCallback(() => setOpen((i) => (i === null ? i : (i - 1 + n) % n)), [n]);
  const next = useCallback(() => setOpen((i) => (i === null ? i : (i + 1) % n)), [n]);

  useEffect(() => {
    if (open === null) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", on);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", on); document.body.style.overflow = ""; };
  }, [open, prev, next]);

  if (!n) return <div className="skeleton aspect-[16/9]" />;
  const buttons = (
    <div className="absolute bottom-3 right-3 z-10 flex gap-2">
      {tourHref && <Link href={tourHref} className="rounded-lg bg-white/95 px-3 py-2 text-[13px] font-semibold text-rs-green-900 shadow">◎ {tourButton}</Link>}
      <button onClick={() => setOpen(0)} className="rounded-lg bg-white/95 px-3 py-2 text-[13px] font-semibold text-rs-green-900 shadow">⊞ All photos ({n})</button>
    </div>
  );

  return (
    <div>
      {/* desktop: 1 large + 4 small */}
      <div className="relative hidden h-[440px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl md:grid">
        {photos.slice(0, 5).map((p, i) => (
          <button key={p.url} onClick={() => setOpen(i)} className={`relative overflow-hidden bg-rs-green-100 ${i === 0 ? "col-span-2 row-span-2" : ""}`} aria-label={`Open photo: ${p.alt}`}>
            <Image src={p.url} alt={p.alt} fill sizes={i === 0 ? "50vw" : "25vw"} className="object-cover transition-transform duration-500 hover:scale-[1.03]" priority={i === 0} />
          </button>
        ))}
        {buttons}
      </div>
      {/* mobile: swipeable */}
      <div className="relative -mx-6 md:hidden">
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-1">
          {photos.map((p, i) => (
            <button key={p.url} onClick={() => setOpen(i)} className="relative aspect-[4/3] w-[86%] shrink-0 snap-center overflow-hidden rounded-xl bg-rs-green-100" aria-label={`Open photo ${i + 1}: ${p.alt}`}>
              <Image src={p.url} alt={p.alt} fill sizes="86vw" className="object-cover" priority={i === 0} />
              <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white">{i + 1}/{n}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 px-6">
          {tourHref && <Link href={tourHref} className="btn-secondary btn-sm flex-1">◎ {tourButton}</Link>}
          <button onClick={() => setOpen(0)} className="btn-secondary btn-sm flex-1">⊞ All photos ({n})</button>
        </div>
      </div>

      {open !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal aria-label="Photos">
          <div className="flex items-center justify-between p-3 text-sm text-white">
            <span className="tabular">{open + 1} / {n}</span>
            <button onClick={() => setOpen(null)} className="rounded-lg px-3 py-1.5 text-2xl leading-none" aria-label="Close">×</button>
          </div>
          <div className="relative flex-1">
            <Image src={photos[open].url} alt={photos[open].alt} fill sizes="100vw" className="object-contain" />
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25" aria-label="Previous photo">‹</button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 px-4 py-3 text-2xl text-white hover:bg-white/25" aria-label="Next photo">›</button>
          </div>
          <p className="p-3 text-center text-sm text-white/85">{photos[open].alt}</p>
          <div className="flex gap-2 overflow-x-auto px-3 pb-3">
            {photos.map((p, i) => (
              <button key={p.url} onClick={() => setOpen(i)} className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${i === open ? "border-white" : "border-transparent opacity-70"}`} aria-label={`Photo ${i + 1}`}>
                <Image src={p.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
