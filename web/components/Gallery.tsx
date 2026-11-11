"use client";
import Image from "next/image";
import { useState } from "react";

export function Gallery({ images }: { images: { src: string; title: string }[] }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  if (!images.length) return <div className="skeleton aspect-[16/10]" />;
  const cur = images[i];
  return (
    <div>
      <button onClick={() => setOpen(true)} className="relative block w-full aspect-[16/10] rounded-2xl overflow-hidden border border-rs-border bg-white" aria-label={`Enlarge ${cur.title}`}>
        <Image src={cur.src} alt={cur.title} fill className="object-contain" unoptimized priority />
        <span className="absolute left-3 bottom-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium">{cur.title}</span>
      </button>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {images.map((im, k) => (
          <button key={im.src} onClick={() => setI(k)} className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 bg-white ${k === i ? "border-rs-green-700" : "border-rs-border"}`} aria-label={im.title}>
            <Image src={im.src} alt="" fill className="object-cover" unoptimized />
          </button>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4" onClick={() => setOpen(false)} role="dialog" aria-modal>
          <div className="relative w-full max-w-5xl aspect-[16/10]">
            <Image src={cur.src} alt={cur.title} fill className="object-contain" unoptimized />
          </div>
          <p className="text-white mt-3">{cur.title} · tap to close</p>
        </div>
      )}
    </div>
  );
}
