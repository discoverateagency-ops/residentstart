import Link from "next/link";
import Image from "next/image";
import { Shell } from "@/components/Shell";
import { FundingBar } from "@/components/FundingBar";
import { StatusPill } from "@/components/StatusPill";
import { getMainProject, tenors } from "@/lib/project";
import { prisma } from "@/lib/db";
import { pct, num } from "@/lib/format";

export const dynamic = "force-dynamic";

const FAQ: [string, string][] = [
  ["Who can invest?", "Anyone with an investor account in this demo. Log in as one of the seeded demo investors: their NEAR testnet account signs the transaction on the server, so you don't need a wallet to try it."],
  ["How much do I need?", "One share costs 10 NEAR (testnet) and is 0.5 % of the project. Send multiples of 10 NEAR; any remainder is refunded in the same transaction."],
  ["How do buyers pay?", "In rupiah, by cash or by a 5, 10 or 15-year installment financed by the DAO pool. In this demo the Virtual Account and QRIS payments are simulated: a simulator page plays the bank."],
  ["Where can I verify on-chain?", "Every investment, vote and repayment receipt has a NearBlocks testnet link. Contracts: dao.residentstart.testnet (shares, voting) and vault.residentstart.testnet (loans, receipts)."],
  ["Is this real money?", "No. This is a hackathon demo on NEAR testnet with synthetic data. Testnet NEAR has no value, no real property is sold and nothing here is an offer to invest."],
];

export default async function Landing() {
  const project = await getMainProject({ sync: true });
  const fundingCount = await prisma.project.count({ where: { published: true, status: "funding" } });
  const cover = project ? await prisma.design.findFirst({ where: { projectId: project.id }, orderBy: { sort: "asc" } }) : null;
  const sold = project?.sharesSold ?? 0;
  const total = project?.totalShares ?? 0;
  const target = project ? project.totalShares * project.sharePriceNear : 0;
  const t = project ? tenors(project) : [];

  return (
    <Shell banner>
      {/* Hero */}
      <section className="container-rs pt-10 md:pt-16 pb-10 grid md:grid-cols-[55%_45%] gap-10 items-center">
        <div>
          <h1 className="text-[34px] leading-[42px] md:text-[48px] md:leading-[56px]">
            Co-invest in homes.
            <br />
            Own the upside.
          </h1>
          <p className="mt-4 text-lg text-rs-ink/80 max-w-xl">
            Fund real houses in Jakarta through the Residentstart DAO on NEAR. Buyers repay; you see every rupiah come back on-chain.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href="/investor" className="btn-primary">Invest</Link>
            <Link href="/buyer" className="btn-secondary">Buy a home</Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <Stat value={num(fundingCount)} label={fundingCount === 1 ? "project funding" : "projects funding"} />
            <Stat value={`${sold} / ${total}`} label="shares sold" />
            <Stat value={`${num(target)} NEAR`} label="target" />
          </div>
        </div>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-rs-border bg-rs-green-100">
          {cover && <Image src={cover.imageUrl} alt="Illustrative render of Cilandak Residence" fill className="object-cover" priority unoptimized />}
        </div>
      </section>

      {/* Projects */}
      <section id="projects" className="container-rs py-10 scroll-mt-20">
        <h2 className="section-title">Projects now funding</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {project && (
            <article className="card p-0 overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-rs-green-100">
                {cover && <Image src={cover.imageUrl} alt="" fill className="object-cover" unoptimized />}
              </div>
              <div className="p-6 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="text-lg">{project.name}</h3>
                  <p className="text-sm text-rs-ink/70">{project.location}</p>
                </div>
                <div className="flex items-center justify-between text-sm tabular">
                  <span className="font-semibold">{project.sharePriceNear} NEAR / share</span>
                  <span>{pct(total ? (sold / total) * 100 : 0)}</span>
                </div>
                <FundingBar sold={sold} total={total} compact />
                <div className="flex items-center gap-2 text-sm">
                  <StatusPill status={project.status} />
                  <span className="text-rs-ink/70">Tenor {t[0]}–{t[t.length - 1]} yrs</span>
                </div>
                <Link href={`/project/${project.slug}`} className="btn-primary mt-auto">View project</Link>
              </div>
            </article>
          )}
          {[1, 2].map((i) => (
            <div key={i} className="hidden md:flex rounded-2xl bg-rs-green-100 border border-rs-border items-center justify-center min-h-[300px] text-rs-green-700 font-medium">
              Next project — coming soon
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-rs py-10 scroll-mt-20">
        <h2 className="section-title">How it works</h2>
        <ol className="grid md:grid-cols-4 gap-4">
          {[
            ["Browse", "See the house, its 2D designs, a 360° tour and live funding."],
            ["Invest or buy", "Investors deposit NEAR testnet for shares. Buyers choose cash or a 5–15 year installment."],
            ["DAO funds the build", "Share holders vote to approve funding. Yes wins → the project is funded."],
            ["Buyers repay, investors verify", "Every rupiah installment leaves a receipt hash on NEAR that anyone can check."],
          ].map(([t1, d], i) => (
            <li key={t1} className="card">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rs-green-700 text-white font-semibold">{i + 1}</span>
              <h3 className="mt-3 text-base">{t1}</h3>
              <p className="mt-1 text-sm text-rs-ink/75">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section id="faq" className="container-rs py-10 scroll-mt-20">
        <h2 className="section-title">Questions</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card py-4 group">
              <summary className="cursor-pointer font-medium text-rs-green-900 list-none flex items-center gap-2">
                <span className="transition-transform group-open:rotate-90">▸</span> {q}
              </summary>
              <p className="mt-2 text-rs-ink/80">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="about" className="container-rs py-10 scroll-mt-20">
        <div className="rounded-3xl bg-rs-green-700 text-white p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-white text-2xl md:text-3xl">Ready to start?</h2>
            <p className="mt-2 text-white/85 max-w-xl">Residentstart is a Jakarta property developer that funds its own housing projects through a DAO on NEAR. This site is a testnet demo.</p>
          </div>
          {project && <Link href={`/project/${project.slug}`} className="btn bg-white text-rs-green-700 hover:bg-rs-green-100">View project</Link>}
        </div>
      </section>
    </Shell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white border border-rs-border p-3 md:p-4">
      <div className="font-[family-name:var(--font-heading)] font-semibold text-rs-green-900 text-base md:text-xl tabular whitespace-nowrap">{value}</div>
      <div className="text-xs md:text-sm text-rs-ink/70">{label}</div>
    </div>
  );
}
