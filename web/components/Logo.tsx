import Link from "next/link";
import Image from "next/image";

export function Logo({ size = 36, withTagline = false }: { size?: number; withTagline?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Residentstart home">
      <Image src="/brand/icon.png" alt="" width={size} height={size} className="rounded-lg" priority />
      <span className="flex flex-col leading-none">
        <span className="font-[family-name:var(--font-heading)] font-semibold text-rs-green-700 text-lg">Residentstart</span>
        {withTagline && <span className="text-[11px] tracking-[0.2em] text-rs-green-500 lowercase">property crowdfunding</span>}
      </span>
    </Link>
  );
}
