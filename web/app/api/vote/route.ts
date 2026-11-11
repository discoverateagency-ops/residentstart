import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { callDao, getChainHolding, getChainProposal, hasSigner, nearErrorMessage } from "@/lib/near";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await requireRole("investor");
    const { proposalId, yes } = (await req.json()) as { proposalId?: string; yes?: boolean };
    if (!proposalId || typeof yes !== "boolean") return json({ error: "proposalId and yes are required" }, 400);
    const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, include: { project: true } });
    if (!proposal) return json({ error: "Proposal not found" }, 404);
    if (proposal.status !== "open") return json({ error: "Voting is closed" }, 400);
    if (!hasSigner(user.nearAccountId)) return json({ error: "This account has no NEAR testnet key in the demo" }, 400);
    if (await prisma.vote.findUnique({ where: { proposalId_userId: { proposalId, userId: user.id } } })) return json({ error: "You already voted" }, 409);
    const holding = await getChainHolding(proposal.project.onchainProjectId!, user.nearAccountId!);
    if (!holding) return json({ error: "Buy shares to vote" }, 400);

    let res;
    try {
      res = await callDao<number>("vote", { proposal_id: proposal.onchainProposalId, yes }, { signer: user.nearAccountId! });
    } catch (e) {
      return json({ error: `Transaction failed: ${nearErrorMessage(e)}` }, 400);
    }
    const weight = Number(res.result ?? holding);
    await prisma.vote.create({ data: { proposalId, userId: user.id, yes, weight, txHash: res.txHash } });
    const chain = await getChainProposal(proposal.onchainProposalId);
    if (chain) await prisma.proposal.update({ where: { id: proposalId }, data: { yesWeight: chain.yes_weight, noWeight: chain.no_weight } });
    return json({ ok: true, weight, txHash: res.txHash, nearblocksUrl: res.nearblocksUrl, yesWeight: chain?.yes_weight, noWeight: chain?.no_weight });
  } catch (e) {
    return handleError(e);
  }
}
