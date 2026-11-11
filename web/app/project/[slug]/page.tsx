import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { FundingBar } from "@/components/FundingBar";
import { StatusPill } from "@/components/StatusPill";
import { AccountLink } from "@/components/TxLink";
import { Gallery } from "@/components/Gallery";
import { TenorTabs } from "@/components/TenorTabs";
import { prisma } from "@/lib/db";
import { getProjectBySlug, projectPricing } from "@/lib/project";
import { idr, num, pct } from "@/lib/format";
import { DAO_CONTRACT, VAULT_CONTRACT } from "@/lib/nearblocks";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  return { title: p?.name ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug, { sync: true });
  if (!project || !project.published) notFound();
  const designs = await prisma.design.findMany({ where: { projectId: project.id }, orderBy: { sort: "asc" } });
  const { cash_price_idr, table } = projectPricing(project);
  const minMonthly = Math.min(...table.map((r) => r.monthly_idr));
  const included = project.included as string[];
  const notIncluded = project.notIncluded as string[];
  const target = project.totalShares * project.sharePriceNear;

  const specs: [string, string][] = [
    [`${project.bedrooms} bed`, "Bedrooms"],
    [`${project.bathrooms} bath`, "Bathrooms"],
    [`${project.landM2} m²`, "Land"],
    [`${project.buildingM2} m²`, "Building"],
    [`${project.floors} fl`, "Floors"],
  ];

  return (
    <Shell banner>
      <div className="container-rs pt-6 pb-28 md:pb-10">
        <Link href="/#projects" className="text-sm text-rs-green-700">‹ Projects</Link>
        <div className="mt-4 grid md:grid-cols-[60%_40%] gap-8">
          {/* left */}
          <div className="min-w-0 flex flex-col gap-8">
            <Gallery images={designs.map((d) => ({ src: d.imageUrl, title: d.title }))} />
            <Link href={`/project/${project.slug}/tour`} className="btn-secondary w-full md:w-auto">◎ Virtual tour</Link>

            <div className="md:hidden">
              <TitleBlock name={project.name} status={project.status} location={project.location} type={project.type} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {specs.map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-rs-border bg-white p-3 text-center">
                  <div className="font-semibold text-rs-green-900 tabular">{v}</div>
                  <div className="text-xs text-rs-ink/60">{l}</div>
                </div>
              ))}
            </div>

            <section>
              <h2 className="section-title">About</h2>
              <p className="text-rs-ink/85 leading-relaxed">{project.description}</p>
            </section>

            <section>
              <h2 className="section-title">What&apos;s included</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                <ul className="space-y-1.5">{included.map((i) => <li key={i} className="flex gap-2"><span className="text-[#027A48]">✓</span>{i}</li>)}</ul>
                <ul className="space-y-1.5">{notIncluded.map((i) => <li key={i} className="flex gap-2 text-rs-ink/70"><span className="text-rs-danger">✗</span>{i}</li>)}</ul>
              </div>
            </section>

            <section>
              <h2 className="section-title">Location</h2>
              <div className="relative aspect-[2/1] rounded-2xl overflow-hidden border border-rs-border">
                <Image src="/designs/map_cilandak.svg" alt="Schematic map of Cilandak, Jakarta Selatan" fill className="object-cover" unoptimized />
              </div>
            </section>

            <section>
              <h2 className="section-title">On-chain</h2>
              <div className="flex flex-col gap-2 text-sm">
                <span>DAO (shares, voting): <AccountLink account={DAO_CONTRACT} /></span>
                <span>Vault (loans, receipts): <AccountLink account={VAULT_CONTRACT} /></span>
                <p className="text-rs-ink/60 mt-2">Designs, renders and the 360° tour are <strong>illustrative designs</strong> for a hackathon demo, not final construction drawings.</p>
              </div>
            </section>
          </div>

          {/* right, sticky on desktop */}
          <aside className="flex flex-col gap-6 md:sticky md:top-24 self-start w-full min-w-0">
            <div className="hidden md:block">
              <TitleBlock name={project.name} status={project.status} location={project.location} type={project.type} />
            </div>
            <section className="card">
              <h2 className="text-lg mb-3">Funding</h2>
              <FundingBar sold={project.sharesSold} total={project.totalShares} />
              <p className="mt-3 text-sm tabular">{project.sharePriceNear} NEAR per share · target {num(target)} NEAR</p>
              <p className="mt-1 text-sm">{pct(project.totalShares ? (project.sharesSold / project.totalShares) * 100 : 0)} funded</p>
              <div className="mt-2 text-sm"><AccountLink account={DAO_CONTRACT} /></div>
              <Link href="/investor" className="btn-primary w-full mt-4">Invest in this project</Link>
            </section>
            <section id="buy" className="card scroll-mt-24">
              <h2 className="text-lg mb-3">Buy this home</h2>
              <div className="flex justify-between gap-2 text-sm tabular">
                <span>Cash price</span>
                <span className="font-semibold text-right">{idr(cash_price_idr)} <span className="text-rs-ink/60">(−{project.cashDiscountPct} %)</span></span>
              </div>
              <div className="flex justify-between gap-2 text-sm tabular mt-1">
                <span>Installment</span>
                <span className="font-semibold text-right">from {idr(minMonthly)} / month</span>
              </div>
              <TenorTabs rows={table} downPaymentPct={project.downPaymentPct} />
              <p className="text-xs text-rs-ink/60 mt-3">Financed by the Residentstart DAO on NEAR · {project.annualRatePct} % p.a. demo rate</p>
              <Link href="/buyer" className="btn-secondary w-full mt-4">Buy this home</Link>
            </section>
          </aside>
        </div>
      </div>

      {/* mobile sticky bottom bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-rs-border p-3 grid grid-cols-2 gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <Link href="/investor" className="btn-primary">Invest</Link>
        <Link href="/buyer" className="btn-secondary">Buy this home</Link>
      </div>
    </Shell>
  );
}

function TitleBlock({ name, status, location, type }: { name: string; status: string; location: string; type: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl md:text-3xl">{name}</h1>
        <StatusPill status={status} />
      </div>
      <p className="mt-1 text-rs-ink/70">{location} · {type}</p>
    </div>
  );
}
