import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { TxLink } from "@/components/TxLink";
import { AgentChat } from "@/components/AgentChat";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { defaultBuyerProject, getProjectBySlug, projectPricing, pricingInput, audienceOf, projectHref, tourHref, unitsLeft } from "@/lib/project";
import { idr, dateId } from "@/lib/format";
import { cashPrice } from "@/lib/pricing";
import { VerificationCard } from "./VerificationCard";
import { BuyCard } from "./BuyCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buyer dashboard" };

export default async function BuyerPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const s = await getSession();
  const { project: want } = await searchParams;
  if (!s) redirect(`/login?role=buyer&next=${encodeURIComponent(want ? `/buyer?project=${want}` : "/buyer")}`);
  if (s.role !== "buyer") redirect(s.role === "admin" ? "/admin" : "/investor");
  const existing = await prisma.loan.findFirst({ where: { userId: s.id, status: { in: ["active", "completed"] } }, orderBy: { createdAt: "desc" }, include: { project: true } });
  const wanted = want ? await getProjectBySlug(want) : null;
  const project = existing?.project ?? (wanted && audienceOf(wanted.status) === "buyer" ? wanted : await defaultBuyerProject());
  if (!project) return <Shell app><div className="container-rs py-10">No homes for sale yet.</div></Shell>;
  const left = (await unitsLeft([project.id]))[project.id] ?? 0;
  const verification = await prisma.verification.findFirst({ where: { userId: s.id }, orderBy: { createdAt: "desc" } });
  const verified = !!verification?.verified;
  const loan = await prisma.loan.findFirst({ where: { userId: s.id, status: { in: ["active", "completed"] } }, orderBy: { createdAt: "desc" }, include: { periods: { orderBy: { periodIndex: "asc" } } } });
  const { table } = projectPricing(project);
  const paid = loan?.periods.filter((p) => p.status === "paid").length ?? 0;
  const next = loan?.periods.find((p) => p.status === "due");

  return (
    <Shell app>
      <div className="container-rs py-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl">Hello, {s.displayName}</h1>
          {verified ? <span className="rounded-full bg-[#D1FADF] text-[#027A48] px-3 py-1 text-xs font-semibold">Verified ✓</span> : <StatusPill status="not verified" />}
        </div>

        {!verified && (
          <div className="mt-6">
            <VerificationCard
              referencePhotoUrl={verification?.referencePhotoUrl ?? null}
              hasDescriptor={!!verification?.descriptor}
              failedAttempts={verification?.failedAttempts ?? 0}
            />
          </div>
        )}

        {existing && want && want !== existing.project.slug && (
          <p className="mt-4 rounded-xl bg-[#FFF3CD] px-4 py-3 text-sm text-[#664D03]">You already have an active purchase for {existing.project.name}. One active purchase per buyer in this demo.</p>
        )}
        <div className="mt-6 grid md:grid-cols-[1fr_380px] gap-6">
          <div className="flex flex-col gap-6 min-w-0">
            <section className="card p-0 overflow-hidden grid sm:grid-cols-[200px_1fr]">
              <div className="relative aspect-video sm:aspect-auto sm:h-full sm:min-h-[150px] bg-rs-green-100"><Image src={project.coverUrl} alt="" fill sizes="200px" className="object-cover" /></div>
              <div className="p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap"><h2 className="text-lg">{project.name}</h2><StatusPill status={project.status} /></div>
                <p className="text-sm text-rs-ink/70">{project.location} · {project.bedrooms} bed · {project.bathrooms} bath · {project.buildingM2} m²</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {project.tourSetId && <Link href={tourHref(project)} className="btn-secondary btn-sm">◎ Walk through the house</Link>}
                  <Link href={projectHref(project)} className="btn btn-sm text-rs-green-700 hover:bg-rs-green-100">Photos & details</Link>
                  {!loan && <Link href="/buy" className="btn btn-sm text-rs-green-700 hover:bg-rs-green-100">Change home</Link>}
                </div>
              </div>
            </section>

            {loan ? (
              <section className="card">
                <div className="flex items-center justify-between gap-2"><h2 className="text-lg">My {loan.mode === "cash" ? "reservation" : "loan"}</h2><StatusPill status={loan.status} /></div>
                {loan.mode === "cash" ? (
                  <div className="mt-3 text-sm space-y-1 tabular">
                    <p>Cash purchase reserved (demo) · {idr(loan.totalIdr ?? BigInt(cashPrice(pricingInput(project))))}</p>
                    <p className="text-rs-ink/60">No payment is taken in this demo. The installment flow shows the on-chain repayment loop.</p>
                  </div>
                ) : (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular">
                    <dt className="text-rs-ink/60">Tenor</dt><dd>{(loan.tenorMonths ?? 0) / 12} years</dd>
                    <dt className="text-rs-ink/60">Monthly</dt><dd className="font-semibold">{idr(loan.monthlyIdr ?? 0)}</dd>
                    <dt className="text-rs-ink/60">Next due</dt><dd>{next ? `Period ${next.periodIndex} · ${dateId(next.dueDate)}` : "All paid"}</dd>
                    <dt className="text-rs-ink/60">Paid</dt><dd>{paid} / {loan.periods.length}</dd>
                    <dt className="text-rs-ink/60">Created</dt><dd><TxLink hash={loan.createTx} /></dd>
                  </dl>
                )}
                {loan.mode === "installment" && <Link href="/buyer/schedule" className="btn-primary w-full sm:w-auto mt-4">View schedule</Link>}
              </section>
            ) : (
              <BuyCard projectSlug={project.slug} unitsLeft={left} verified={verified} rows={table} cashPriceIdr={cashPrice(pricingInput(project))} listPriceIdr={Number(project.listPriceIdr)} discountPct={project.cashDiscountPct} downPaymentPct={project.downPaymentPct} />
            )}
          </div>
          <aside className="md:sticky md:top-24 self-start w-full min-w-0">
            <div id="agent" className="scroll-mt-24"><AgentChat agent="buyer" project={project.slug} title="Ask about this home" chips={["How big is the master bedroom?", "What's included?", "Monthly for 10 years?", "When is my next payment?"]} /></div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
