import Link from "next/link";
import { Logo } from "./Logo";

const BADGES: [string, string, string][] = [
  ["Co-Invest", "in Property", "M7 11l3-3 3 3 4-4M3 17h18M5 21h14"],
  ["Powered by", "NEAR Blockchain", "M12 3l8 4.5-8 4.5-8-4.5L12 3zm-8 9l8 4.5 8-4.5M4 16.5L12 21l8-4.5"],
  ["Community-", "Driven", "M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5m0-5c3 0 8 2 8 5"],
  ["Build", "Real Value", "M3 20h18M6 16v4m4-8v8m4-6v6m4-10v10M5 11l5-5 4 3 6-6"],
];

export function Footer() {
  return (
    <footer className="mt-16 bg-white border-t border-rs-border">
      <div className="container-rs py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {BADGES.map(([a, b, d]) => (
            <div key={a} className="flex items-center gap-3 rounded-2xl border border-rs-border p-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E4D45" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
              <span className="text-sm leading-tight text-rs-green-900">{a}<br />{b}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <Logo withTagline />
            <p className="mt-3 text-rs-ink/70">Property crowdfunding on NEAR. Built for the NEAR Hackathon 2026.</p>
          </div>
          <div>
            <h4 className="text-sm mb-2">Invest</h4>
            <ul className="space-y-1.5"><li><Link href="/#projects">Projects</Link></li><li><Link href="/#how">How it works</Link></li><li><Link href="/#faq">FAQ</Link></li></ul>
          </div>
          <div>
            <h4 className="text-sm mb-2">Buy</h4>
            <ul className="space-y-1.5"><li><Link href="/project/cilandak-residence">Browse homes</Link></li><li><Link href="/project/cilandak-residence/tour">Virtual tour</Link></li><li><Link href="/project/cilandak-residence#buy">Payment options</Link></li></ul>
          </div>
          <div>
            <h4 className="text-sm mb-2">Company</h4>
            <ul className="space-y-1.5"><li><Link href="/#about">About</Link></li><li><a href="mailto:team@residentstart.biz.id">Contact</a></li><li><a href="https://github.com/discoverateagency-ops/residentstart" target="_blank" rel="noreferrer">GitHub</a></li></ul>
          </div>
        </div>
        <p className="mt-10 text-xs text-rs-ink/60 border-t border-rs-border pt-6">
          Residentstart is a hackathon demo on NEAR testnet. Nothing here is an offer to invest or a real sale.
        </p>
      </div>
    </footer>
  );
}
