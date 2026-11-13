import Link from "next/link";
import Image from "next/image";
import { Shell } from "@/components/Shell";
import { LandingExplorer } from "@/components/LandingExplorer";
import { AreaTiles } from "@/components/AreaTiles";
import { PostCard } from "@/components/PostCard";
import { prisma } from "@/lib/db";
import { listProjects } from "@/lib/project";
import { toCards } from "@/lib/cards";

export const dynamic = "force-dynamic";

const WHY: [string, string, string][] = [
  ["Developer-direct price", "No agent markup: you buy from the developer that builds the house.", "M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"],
  ["Installment up to 15 yrs without a bank", "20 % down payment; the rest is financed by the Residentstart DAO pool.", "M4 7h16M4 12h16M4 17h10"],
  ["Every payment verifiable on NEAR", "Each paid installment leaves a receipt hash on the vault contract.", "M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"],
  ["Walk through before you buy", "Photo walkthrough of the real show unit, on your phone.", "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z"],
];

const STEPS: [string, string, string][] = [
  ["Choose a home", "Compare prices, specs and the monthly amount for 5, 10 or 15 years.", "/projects/cilandak-residence/cover.jpg"],
  ["Walk through it", "Open the photo walkthrough and the floor plans before you decide.", "/projects/cilandak-residence/living.jpg"],
  ["Verify and confirm", "A quick identity check, then cash or installment. The loan is recorded on NEAR.", "/projects/cilandak-residence/kitchen-dining.jpg"],
  ["Pay monthly in rupiah", "Virtual Account or QRIS. Every receipt is on-chain for you and the investors.", "/projects/cilandak-residence/master-bedroom-2.jpg"],
];

export default async function Landing() {
  const buyer = await listProjects({ audience: "buyer", sync: true });
  const cards = await toCards(buyer);
  const [testimonials, posts] = await Promise.all([
    prisma.testimonial.findMany({ orderBy: { sort: "asc" }, take: 3 }),
    prisma.blogPost.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, take: 3 }),
  ]);

  return (
    <Shell banner>
      <LandingExplorer cards={cards} />

      <section className="container-rs pt-14" aria-labelledby="why">
        <h2 id="why" className="text-xl md:text-2xl">Why buy from Residentstart</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(([t, d, icon]) => (
            <div key={t} className="flex gap-3 rounded-2xl border border-rs-border p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rs-green-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E4D45" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={icon} /></svg>
              </span>
              <div><h3 className="text-[15px]">{t}</h3><p className="mt-0.5 text-[13px] text-rs-ink/70">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-rs pt-14" aria-labelledby="how">
        <h2 id="how" className="text-xl md:text-2xl">How buying works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d, img], i) => (
            <li key={t} className="overflow-hidden rounded-2xl border border-rs-border">
              <div className="relative aspect-[16/9] bg-rs-green-100"><Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" /></div>
              <div className="p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rs-green-700 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-2 text-[15px]">{t}</h3>
                <p className="mt-0.5 text-[13px] text-rs-ink/70">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-rs pt-14" aria-labelledby="loc">
        <h2 id="loc" className="text-xl md:text-2xl">Browse by location</h2>
        <AreaTiles />
      </section>

      {testimonials.length > 0 && (
        <section className="container-rs pt-14" aria-labelledby="say">
          <h2 id="say" className="text-xl md:text-2xl">What buyers say</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="rounded-2xl border border-rs-border p-5">
                <blockquote className="text-[15px] leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rs-green-700 font-semibold text-white" aria-hidden>{t.name.slice(0, 1)}</span>
                  <span className="text-sm"><strong className="block text-rs-green-900">{t.name}</strong><span className="text-rs-ink/60">{t.role}</span></span>
                  {t.isDemo && <span className="ml-auto rounded bg-[#F2F4F3] px-1.5 py-0.5 text-[11px] text-rs-ink/60">demo testimonial</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="container-rs pt-14" aria-labelledby="blog">
          <div className="flex items-end justify-between">
            <h2 id="blog" className="text-xl md:text-2xl">From the blog</h2>
            <Link href="/blog" className="text-sm font-semibold text-rs-green-700">All articles →</Link>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {posts.map((p) => <PostCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <section className="container-rs py-14">
        <div className="flex flex-col gap-3 rounded-2xl border border-rs-border bg-rs-bg p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px]"><strong className="text-rs-green-900">Want to fund the next project?</strong> See projects open for funding on the Residentstart DAO.</p>
          <Link href="/invest" className="btn-secondary btn-sm min-h-10 shrink-0">For Investor →</Link>
        </div>
      </section>
    </Shell>
  );
}
