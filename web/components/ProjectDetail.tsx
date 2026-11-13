import Link from "next/link";
import type { Project, TourSet } from "@prisma/client";
import { PhotoGallery } from "./PhotoGallery";
import { TenorTabs } from "./TenorTabs";
import { HomeCard, InvestCard, SpecRow } from "./HomeCard";
import { StatusPill } from "./StatusPill";
import { FundingBar } from "./FundingBar";
import { AccountLink, TxLink } from "./TxLink";
import { LocationMap } from "./LocationMap";
import { audienceOf, floorplansOf, nearbyOf, photosOf, projectPricing, tourHref as tourHrefOf, tourLabel, unitsLeft, type Audience } from "@/lib/project";
import type { CardData } from "@/lib/cards";
import { idr, idrShort, num, pct } from "@/lib/format";
import { DAO_CONTRACT, VAULT_CONTRACT } from "@/lib/nearblocks";

type RoomSpec = { name: string; floor: number; size_m2: number; notes: string };
const NEARBY_ICON: Record<string, string> = { transport: "🚇", school: "🎓", mall: "🛍️", hospital: "🏥" };
const STATUS_TEXT: Record<string, string> = { funding: "Open for funding", funded: "Funded · ready to order", in_construction: "In construction", completed: "Ready to move in" };

export type FundingInfo = { proposal: { description: string; status: string; yes: number; no: number; createTx: string | null } | null; investHref: string };

export async function ProjectDetail({ p, similar, funding }: { p: Project & { tourSet: TourSet | null }; similar: CardData[]; funding?: FundingInfo }) {
  const audience: Audience = audienceOf(p.status);
  const photos = photosOf(p);
  const plans = floorplansOf(p);
  const nearby = nearbyOf(p);
  const rooms = (p.roomsSpec as RoomSpec[]) ?? [];
  const { cash_price_idr, table } = projectPricing(p);
  const tour = p.tourSet ? tourHrefOf(p) : null;
  const label = tourLabel(p, p.tourSet);
  const left = (await unitsLeft([p.id]))[p.id] ?? p.units;
  const included = p.included as string[];
  const notIncluded = p.notIncluded as string[];
  const crumbs = audience === "investor" ? ["/invest", "For Investor"] : ["/buy", "For Buyer"];
  const target = p.totalShares * p.sharePriceNear;
  const fundedPct = p.totalShares ? (p.sharesSold / p.totalShares) * 100 : 0;
  const shortName = p.name.replace("Residentstart ", "");

  const specs: [string, string][] = [
    ["Type", p.type],
    ["Bedrooms (KT)", String(p.bedrooms)],
    ["Bathrooms (KM)", String(p.bathrooms)],
    ["Land (LT)", `${p.landM2} m²`],
    ["Building (LB)", `${p.buildingM2} m²`],
    ["Floors", String(p.floors)],
    ["Certificate", p.certificate],
    ["Units", audience === "investor" ? `${p.units} planned` : `${left} of ${p.units} available`],
    ["Electricity", "2,200 VA"],
    ["Carport", "1 car, roofed"],
  ];

  return (
    <div className="container-rs pb-28 pt-5 md:pb-12">
      <nav className="text-[13px] text-rs-ink/60" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-rs-green-700">Home</Link> › <Link href={crumbs[0]} className="hover:text-rs-green-700">{crumbs[1]}</Link> › <span className="text-rs-ink">{shortName}</span>
      </nav>

      <div className="mt-4">
        <PhotoGallery photos={photos.map((x) => ({ url: x.url, alt: x.alt }))} tourHref={tour} tourButton={audience === "investor" ? "360° show-unit preview" : "360° tour"} />
        {label && <p className="mt-2 text-[13px] text-rs-ink/60">{audience === "investor" ? "Design reference — the built unit may differ." : label}</p>}
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[62%_1fr]">
        <div className="min-w-0 flex flex-col gap-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] leading-[32px] md:text-[32px] md:leading-[40px]">{p.name}</h1>
              <StatusPill status={p.status} />
            </div>
            <p className="mt-1 text-[15px] text-rs-ink/70">{p.location} · <a href="#location" className="text-rs-green-700 underline">map</a> · {STATUS_TEXT[p.status]}</p>
            <SpecRow c={p} className="mt-2 text-[14px]" />
          </header>

          <section aria-labelledby="about">
            <h2 id="about" className="mb-2 text-lg md:text-xl">About</h2>
            <p className="text-[15px] leading-relaxed text-rs-ink/85">{p.descriptionLong || p.description}</p>
          </section>

          <section aria-labelledby="specs">
            <h2 id="specs" className="mb-3 text-lg md:text-xl">Specifications</h2>
            <dl className="grid overflow-hidden rounded-2xl border border-rs-border text-[14px] sm:grid-cols-2">
              {specs.map(([k, v], i) => (
                <div key={k} className={`flex justify-between gap-3 px-4 py-2.5 ${i % 2 === 0 ? "sm:border-r" : ""} border-b border-rs-border`}>
                  <dt className="text-rs-ink/60">{k}</dt><dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {rooms.length > 0 && (
              <details className="mt-3 rounded-2xl border border-rs-border p-4 text-[14px]">
                <summary className="cursor-pointer font-semibold text-rs-green-900">Room sizes {p.tourSet && (p.tourSet.config as { project?: string }).project !== p.slug ? "(show-unit layout)" : ""}</summary>
                <table className="mt-3 w-full tabular"><tbody>
                  {rooms.map((r) => <tr key={r.name} className="border-t border-rs-border"><td className="py-1.5 pr-2">{r.name}</td><td className="pr-2 text-rs-ink/60">{r.floor === 1 ? "Ground" : "Upper"}</td><td className="text-right">{r.size_m2} m²</td></tr>)}
                </tbody></table>
              </details>
            )}
          </section>

          <section aria-labelledby="inc">
            <h2 id="inc" className="mb-3 text-lg md:text-xl">What&apos;s included</h2>
            <div className="grid gap-6 sm:grid-cols-2 text-[14px]">
              <ul className="space-y-1.5">{included.map((i) => <li key={i} className="flex gap-2"><span className="text-[#027A48]">✓</span>{i}</li>)}</ul>
              <ul className="space-y-1.5">{notIncluded.map((i) => <li key={i} className="flex gap-2 text-rs-ink/70"><span className="text-rs-danger">✗</span>{i}</li>)}</ul>
            </div>
          </section>

          {plans.length > 0 && (
            <section aria-labelledby="plans">
              <h2 id="plans" className="mb-3 text-lg md:text-xl">Floor plans</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((u, i) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-rs-border bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={i === 0 ? "Ground floor plan" : "Upper floor plan"} className="w-full" loading="lazy" />
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-rs-ink/60">Illustrative plans, not to scale.</p>
            </section>
          )}

          <section id="location" aria-labelledby="loc" className="scroll-mt-24">
            <h2 id="loc" className="mb-3 text-lg md:text-xl">Location</h2>
            <LocationMap area={p.location} nearby={nearby} />
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-[14px]">
              {nearby.map((n) => <li key={n.name} className="flex items-center justify-between rounded-xl border border-rs-border px-3 py-2"><span>{NEARBY_ICON[n.kind] ?? "📍"} {n.name}</span><span className="tabular text-rs-ink/60">{n.distance_km.toLocaleString("id-ID")} km</span></li>)}
            </ul>
            <p className="mt-2 text-[12px] text-rs-ink/60">Demo location: distances and points of interest are indicative; the exact address is not published.</p>
          </section>

          <section aria-labelledby="chain">
            <h2 id="chain" className="mb-2 text-lg md:text-xl">On-chain</h2>
            <div className="flex flex-col gap-1.5 text-[14px]">
              <span>DAO (shares, voting): <AccountLink account={DAO_CONTRACT} /></span>
              <span>Vault (loans, repayment receipts): <AccountLink account={VAULT_CONTRACT} /></span>
              {p.onchainProjectId && <span className="text-rs-ink/60">On-chain project id: <span className="mono break-all">{p.onchainProjectId}</span></span>}
            </div>
          </section>

          {similar.length > 0 && (
            <section aria-labelledby="similar">
              <h2 id="similar" className="mb-3 text-lg md:text-xl">{audience === "investor" ? "Other projects" : "Similar homes"}</h2>
              <div className="grid gap-5 sm:grid-cols-2">{similar.slice(0, 2).map((c) => (audienceOf(c.status) === "investor" ? <InvestCard key={c.slug} c={c} /> : <HomeCard key={c.slug} c={c} />))}</div>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 self-start md:sticky md:top-24">
          {audience === "buyer" ? (
            <section className="card" aria-label="Price">
              <p className="text-[13px] text-rs-ink/60">Price</p>
              <p className="text-2xl font-semibold text-rs-green-900 tabular">{idr(p.listPriceIdr)}</p>
              <p className="mt-1 text-[14px] tabular">Cash −{p.cashDiscountPct} %: <strong>{idr(cash_price_idr)}</strong></p>
              <TenorTabs rows={table} downPaymentPct={p.downPaymentPct} />
              <p className="mt-3 text-[12px] text-rs-ink/60">DAO-financed · recorded on NEAR · {p.annualRatePct} % p.a. demo rate</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={`/buyer?project=${p.slug}`} className="btn-primary" aria-disabled={left === 0}>{left === 0 ? "Sold out" : "Buy this home"}</Link>
                <Link href={`/buyer?project=${p.slug}#agent`} className="btn-secondary">Ask the agent</Link>
              </div>
              {left > 0 && left <= 3 && <p className="mt-2 text-[12px] font-semibold text-[#B54708]">Sisa {left} unit</p>}
            </section>
          ) : (
            <section className="card" aria-label="Funding">
              <div className="flex items-center justify-between"><p className="text-[13px] text-rs-ink/60">Funding</p><StatusPill status={p.status} /></div>
              <p className="mt-1 text-2xl font-semibold text-rs-green-900 tabular">{p.sharePriceNear} NEAR <span className="text-base font-normal text-rs-ink/60">/ share</span></p>
              <div className="mt-3"><FundingBar sold={p.sharesSold} total={p.totalShares} /></div>
              <p className="mt-2 text-[14px] tabular">Target {num(target)} NEAR · {pct(fundedPct)} funded</p>
              <p className="text-[14px] tabular">Planned buyer price {idrShort(p.listPriceIdr)} / unit · {p.units} units</p>
              {funding?.proposal ? (
                <div className="mt-3 rounded-xl bg-rs-bg p-3 text-[13px]">
                  <p className="font-semibold">Proposal: {funding.proposal.description}</p>
                  <p className="tabular">Yes {funding.proposal.yes} · No {funding.proposal.no} shares · <StatusPill status={funding.proposal.status} /></p>
                  {funding.proposal.createTx && <TxLink hash={funding.proposal.createTx} label="opened" />}
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-rs-ink/60">No funding proposal open yet.</p>
              )}
              <Link href={funding?.investHref ?? "/login?role=investor"} className="btn-primary mt-4 w-full">Invest</Link>
              {!p.onchainProjectId && <p className="mt-2 text-[12px] text-[#B54708]">Not yet created on-chain; the admin opens it from the DAO panel.</p>}
              <div className="mt-3 text-[13px]"><AccountLink account={DAO_CONTRACT} /></div>
            </section>
          )}

          {audience === "investor" && (
            <section className="card text-[14px]" aria-label="Unit plan">
              <h2 className="text-base">Unit plan</h2>
              <ul className="mt-2 space-y-1 text-rs-ink/80">
                <li>{p.units} units · land {p.landM2} m² per unit</li>
                <li>Building {p.buildingM2} m² · KT {p.bedrooms} · KM {p.bathrooms}</li>
                <li>Buyer tenors: {(p.tenorYears as number[]).join(", ")} years</li>
              </ul>
            </section>
          )}

          <section className="card text-[14px]" aria-label="Contact">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rs-green-700 font-semibold text-white" aria-hidden>RS</span>
              <div><p className="font-semibold text-rs-green-900">Residentstart sales (demo)</p><p className="text-rs-ink/60">Mon–Sat, 09:00–18:00 WIB</p></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a className="btn-secondary btn-sm min-h-10" href={`https://wa.me/?text=${encodeURIComponent(`Hi Residentstart, I'm interested in ${p.name} (demo).`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              <a className="btn-secondary btn-sm min-h-10" href={`mailto:team@residentstart.biz.id?subject=${encodeURIComponent(p.name)}`}>Email</a>
            </div>
            <p className="mt-2 text-[12px] text-rs-ink/50">Demo contact — no real sales team.</p>
          </section>
        </aside>
      </div>

      {/* mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-rs-border bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
        <span className="mr-auto text-[15px] font-semibold text-rs-green-900 tabular">{audience === "investor" ? `${p.sharePriceNear} NEAR / share` : idrShort(p.listPriceIdr)}</span>
        {tour && <Link href={tour} className="btn-secondary btn-sm min-h-10">360°</Link>}
        {audience === "investor" ? <Link href={funding?.investHref ?? "/login?role=investor"} className="btn-primary btn-sm min-h-10">Invest</Link> : <Link href={`/buyer?project=${p.slug}`} className="btn-primary btn-sm min-h-10">Buy</Link>}
      </div>
    </div>
  );
}
