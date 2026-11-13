import Link from "next/link";
import Image from "next/image";
import { Shell } from "@/components/Shell";
import { InvestCard, HomeCard } from "@/components/HomeCard";
import { listProjects } from "@/lib/project";
import { toCards } from "@/lib/cards";
import { num } from "@/lib/format";
import { DAO_CONTRACT, accountUrl } from "@/lib/nearblocks";

export const dynamic = "force-dynamic";
export const metadata = { title: "For Investor", description: "Projects open for funding on the Residentstart DAO (NEAR testnet)." };

const STEPS: [string, string][] = [
  ["Buy shares", "Deposit NEAR testnet into the dao contract. 1 share = 10 NEAR; any remainder is refunded in the same transaction."],
  ["DAO votes", "Share holders vote on the funding proposal. Your vote weight equals your shares."],
  ["Build", "If yes outweighs no, the project is funded and construction can start."],
  ["Buyers repay, you verify", "Buyers pay in rupiah; every paid installment is written to the vault contract as a receipt hash."],
];

const FAQ: [string, string][] = [
  ["Who can invest in this demo?", "Log in as one of the seeded demo investors. Their NEAR testnet accounts sign on the server, so you don't need a wallet to try it. Production would use your own wallet."],
  ["How much is one share?", "10 NEAR (testnet). Send multiples of 10 NEAR; the remainder is refunded in the same transaction."],
  ["What do share holders decide?", "One proposal type: approve the project for funding. Weight = shares, one vote per account, final."],
  ["Do I earn a return?", "No returns are promised or paid in this demo. Repayment distribution to share holders is not implemented; testnet NEAR has no value."],
  ["Where can I verify?", "Every invest, vote and repayment receipt links to NearBlocks testnet. Contracts: dao.residentstart.testnet and vault.residentstart.testnet."],
];

export default async function InvestPage() {
  const all = await listProjects({ sync: true });
  const funding = all.filter((p) => p.status === "funding");
  const funded = all.filter((p) => p.status !== "funding");
  const [fCards, doneCards] = await Promise.all([toCards(funding), toCards(funded)]);
  const target = funding.reduce((a, p) => a + p.totalShares * p.sharePriceNear, 0);
  const sold = funding.reduce((a, p) => a + p.sharesSold, 0);

  return (
    <Shell banner>
      <section className="relative">
        <div className="relative h-[380px] overflow-hidden">
          <Image src="/hero/invest.jpg" alt="Residentstart cluster facade" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/50 to-black/10" />
          <div className="container-rs relative flex h-full flex-col justify-end pb-10">
            <h1 className="text-[28px] leading-[34px] text-white md:text-[36px] md:leading-[44px]">Fund the next Residentstart homes.</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-white/90 md:text-base">Buy shares in a project on the NEAR DAO. Buyers repay in rupiah; every repayment is recorded on-chain.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login?role=investor" className="btn-primary">Investor login</Link>
              <a href="#how" className="btn bg-white/95 text-rs-green-700 hover:bg-white">How it works</a>
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-rs-border">
        <div className="container-rs grid grid-cols-2 gap-3 py-4 text-[14px] md:grid-cols-4">
          <Stat v={String(funding.length)} l={funding.length === 1 ? "project funding" : "projects funding"} />
          <Stat v={`${num(target)} NEAR`} l="total target" />
          <Stat v={String(sold)} l="shares sold" />
          <div><a href={accountUrl(DAO_CONTRACT)} target="_blank" rel="noreferrer" className="font-semibold text-rs-green-700">testnet ↗</a><p className="text-rs-ink/60">dao.residentstart.testnet</p></div>
        </div>
      </div>

      <section className="container-rs pt-10" aria-labelledby="open">
        <h2 id="open" className="text-xl md:text-2xl">Projects open for funding</h2>
        {fCards.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-rs-border p-6 text-center text-rs-ink/70">No project is open for funding right now. Check back soon.</p>
        ) : (
          <div className="mt-4 grid gap-5 md:grid-cols-2">{fCards.map((c) => <InvestCard key={c.slug} c={c} />)}</div>
        )}
      </section>

      <section id="how" className="container-rs scroll-mt-20 pt-14" aria-labelledby="howh">
        <h2 id="howh" className="text-xl md:text-2xl">How funding works</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-rs-border p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rs-green-700 text-sm font-semibold text-white">{i + 1}</span>
              <h3 className="mt-2 text-[15px]">{t}</h3>
              <p className="mt-0.5 text-[13px] text-rs-ink/70">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] text-rs-ink/70">Every step is a transaction you can open on <a href={accountUrl(DAO_CONTRACT)} target="_blank" rel="noreferrer" className="text-rs-green-700 underline">NearBlocks</a>. Read more: <Link href="/blog/apa-itu-dao-properti" className="text-rs-green-700 underline">What is a property DAO</Link>.</p>
      </section>

      {doneCards.length > 0 && (
        <section className="container-rs pt-14" aria-labelledby="done">
          <div className="flex items-end justify-between">
            <h2 id="done" className="text-xl md:text-2xl">Already funded</h2>
            <Link href="/buy" className="text-sm font-semibold text-rs-green-700">See on For Buyer →</Link>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{doneCards.map((c) => <HomeCard key={c.slug} c={c} />)}</div>
        </section>
      )}

      <section className="container-rs pt-14" aria-labelledby="faq">
        <h2 id="faq" className="text-xl md:text-2xl">Investor FAQ</h2>
        <div className="mt-4 flex flex-col gap-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-rs-border px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-rs-green-900"><span className="transition-transform group-open:rotate-90">▸</span>{q}</summary>
              <p className="mt-2 text-[15px] text-rs-ink/80">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-rs py-12">
        <p className="rounded-2xl bg-[#FFF3CD] p-4 text-[14px] text-[#664D03]">Testnet demo: no returns are promised, testnet NEAR has no value, and nothing here is an offer to invest. A production version would need a licensed structure under Indonesia&apos;s OJK securities-crowdfunding rules.</p>
      </section>
    </Shell>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return <div><p className="font-semibold text-rs-green-900 tabular">{v}</p><p className="text-rs-ink/60">{l}</p></div>;
}
