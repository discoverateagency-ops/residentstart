"use client";
import Image from "next/image";
import { requestAreaFilter } from "@/lib/filters";

const TILES: [string, string, string][] = [
  ["Cilandak", "cilandak", "Jakarta Selatan"],
  ["Jagakarsa", "jagakarsa", "Jakarta Selatan"],
  ["Cipete", "cipete", "Jakarta Selatan"],
  ["Pondok Aren", "pondok-aren", "Tangerang Selatan"],
  ["Depok", "depok", "Jawa Barat"],
];

export function AreaTiles() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TILES.map(([name, img, sub]) => (
        <button key={name} onClick={() => requestAreaFilter(name)} className="group relative aspect-[4/3] overflow-hidden rounded-2xl text-left" aria-label={`Show homes in ${name}`}>
          <Image src={`/areas/${img}.jpg`} alt="" fill sizes="(max-width: 768px) 50vw, 20vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute bottom-3 left-3 text-white"><strong className="block text-[15px]">{name}</strong><span className="text-[12px] text-white/85">{sub}</span></span>
        </button>
      ))}
    </div>
  );
}
