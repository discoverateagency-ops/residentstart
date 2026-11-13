import "server-only";
import { prisma } from "./db";
import { audienceOf, getProjectBySlug, listProjects } from "./project";
import { toCards } from "./cards";
import { getChainProposal } from "./near";
import type { FundingInfo } from "@/components/ProjectDetail";
import { getSession } from "./session";

export async function loadDetail(slug: string) {
  const p = await getProjectBySlug(slug, { sync: true });
  if (!p || !p.published) return null;
  const aud = audienceOf(p.status);
  const others = (await listProjects({ audience: aud })).filter((x) => x.slug !== slug);
  // similar: same audience, nearest price first
  others.sort((a, b) => Math.abs(Number(a.listPriceIdr - p.listPriceIdr)) - Math.abs(Number(b.listPriceIdr - p.listPriceIdr)));
  const similar = await toCards(others.slice(0, 2));
  let funding: FundingInfo | undefined;
  if (aud === "investor") {
    const prop = await prisma.proposal.findFirst({ where: { projectId: p.id }, orderBy: { createdAt: "desc" } });
    let proposal: FundingInfo["proposal"] = null;
    if (prop) {
      let yes = prop.yesWeight, no = prop.noWeight, status = prop.status;
      try {
        const c = await getChainProposal(prop.onchainProposalId);
        if (c) ({ yes_weight: yes, no_weight: no, status } = c);
      } catch { /* DB values */ }
      proposal = { description: prop.description, status, yes, no, createTx: prop.createTx };
    }
    const s = await getSession();
    const investHref = s?.role === "investor" ? `/investor?project=${p.slug}` : `/login?role=investor&next=${encodeURIComponent(`/investor?project=${p.slug}`)}`;
    funding = { proposal, investHref };
  }
  return { p, aud, similar, funding };
}
