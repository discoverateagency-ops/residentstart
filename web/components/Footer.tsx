import Link from "next/link";
import { Logo } from "./Logo";

const BADGES: [string, string, string][] = [
  ["Co-Invest", "in Property", "M7 11l3-3 3 3 4-4M3 17h18M5 21h14"],
  ["Powered by", "NEAR Blockchain", "M12 3l8 4.5-8 4.5-8-4.5L12 3zm-8 9l8 4.5 8-4.5M4 16.5L12 21l8-4.5"],
  ["Community-", "Driven", "M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5m0-5c3 0 8 2 8 5"],
  ["Build", "Real Value", "M3 20h18M6 16v4m4-8v8m4-6v6m4-10v10M5 11l5-5 4 3 6-6"],
];

const COLS: [string, [string, string][]][] = [
  ["Buy", [["/buy", "Homes ready to buy"], ["/buy/cilandak-residence/tour", "Virtual tour"], ["/blog/cicilan-5-10-15-tahun", "Installment options"], ["/blog/cara-beli-rumah-tanpa-bank", "How buying works"]]],
  ["Invest", [["/invest", "Projects open for funding"], ["/login?role=investor", "Investor login"], ["/blog/apa-itu-dao-properti", "What is a property DAO"], ["/blog/near-testnet-bukti-onchain", "Verify on NearBlocks"]]],
  ["Company", [["/blog", "Blog"], ["mailto:team@residentstart.biz.id", "Contact"], ["https://github.com/discoverateagency-ops/residentstart", "GitHub"], ["https://testnet.nearblocks.io/address/dao.residentstart.testnet", "DAO on NearBlocks"]]],
  ["Legal", [["https://github.com/discoverateagency-ops/residentstart/blob/main/LICENSE", "MIT licence"], ["https://github.com/discoverateagency-ops/residentstart/blob/main/docs/credits.md", "Image credits"], ["https://github.com/discoverateagency-ops/residentstart#what-is-simulated", "What is simulated"]]],
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-rs-border">
      <div className="container-rs py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {BADGES.map(([a, b, d]) => (
            <div key={a} className="flex items-center gap-3 rounded-xl border border-rs-border p-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E4D45" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
              <span className="text-[13px] leading-tight text-rs-green-900">{a}<br />{b}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <Logo withTagline />
            <p className="mt-3 text-rs-ink/70 text-[13px]">Developer-direct homes in Jakarta, funded through a DAO on NEAR. Built for the NEAR Hackathon 2026.</p>
          </div>
          {COLS.map(([h, links]) => (
            <div key={h}>
              <h4 className="text-sm mb-2">{h}</h4>
              <ul className="space-y-1.5 text-[14px]">
                {links.map(([href, label]) => (
                  <li key={href}>{href.startsWith("/") ? <Link href={href} className="hover:text-rs-green-700">{label}</Link> : <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="hover:text-rs-green-700">{label}</a>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-rs-border pt-6 text-xs text-rs-ink/60 space-y-1">
          <p>Residentstart is a hackathon demo on NEAR testnet. Nothing here is an offer to invest or a real sale.</p>
          <p>Photos: Residentstart show unit (team photos); other homes use the same unit type as a reference. Floor plans and specs are illustrative. Full list in docs/credits.md.</p>
        </div>
      </div>
    </footer>
  );
}
