import { Shell } from "@/components/Shell";
import { BuyExplorer } from "@/components/BuyExplorer";
import { listProjects } from "@/lib/project";
import { toCards } from "@/lib/cards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homes ready to buy", description: "Residentstart homes you can buy now: cash or DAO-financed installments up to 15 years." };

export default async function BuyPage() {
  const cards = await toCards(await listProjects({ audience: "buyer", sync: true }));
  return (
    <Shell banner>
      <div className="border-b border-rs-border bg-white">
        <div className="container-rs py-6">
          <h1 className="text-[28px] leading-[34px] md:text-[32px] md:leading-[40px]">Homes ready to buy <span className="text-rs-ink/50 font-normal text-xl">({cards.length})</span></h1>
          <p className="mt-1 text-[15px] text-rs-ink/70">Funded, in construction or ready to move in. Cash or DAO-financed installments over 5, 10 or 15 years.</p>
        </div>
      </div>
      <div className="container-rs py-8"><BuyExplorer cards={cards} /></div>
    </Shell>
  );
}
