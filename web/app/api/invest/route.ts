import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { callDao, getChainHolding, getChainProject, hasSigner, nearErrorMessage, nearToYocto, YOCTO_PER_NEAR } from "@/lib/near";
import { getMainProject } from "@/lib/project";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await requireRole("investor");
    const { amountNear } = (await req.json()) as { amountNear?: number | string };
    const amount = Number(amountNear);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Enter an amount greater than 0 NEAR" }, 400);
    if (Math.round(amount * 10000) !== amount * 10000) return json({ error: "Use at most 4 decimals" }, 400);
    if (amount > 1000) return json({ error: "Maximum 1,000 NEAR per transaction in this demo" }, 400);
    if (!hasSigner(user.nearAccountId)) {
      return json({ error: "This account has no NEAR testnet key in the demo. Log in as investor1 or investor2 to invest." }, 400);
    }
    const project = await getMainProject();
    if (!project?.onchainProjectId) return json({ error: "The project is not on-chain yet. Ask the admin to create it." }, 400);

    const chain = await getChainProject(project.onchainProjectId);
    if (!chain) return json({ error: "Project not found on-chain" }, 400);
    if (chain.status !== "funding") return json({ error: `The project is ${chain.status}; investing is closed.` }, 400);
    const deposit = nearToYocto(amount);
    const price = BigInt(chain.share_price_yocto);
    const shares = Number(deposit / price);
    const remaining = chain.total_shares - chain.shares_sold;
    if (shares > remaining) return json({ error: `Only ${remaining} shares left (${remaining * project.sharePriceNear} NEAR). Lower the amount.` }, 400);
    if (shares === 0) return json({ error: `The minimum is ${project.sharePriceNear} NEAR for 1 share.` }, 400);

    let res;
    try {
      res = await callDao<number>("invest", { project_id: project.onchainProjectId }, { signer: user.nearAccountId!, depositYocto: deposit });
    } catch (e) {
      return json({ error: `Transaction failed: ${nearErrorMessage(e)}` }, 400);
    }
    const got = Number(res.result ?? shares);
    await prisma.investment.create({
      data: { userId: user.id, projectId: project.id, amountYocto: deposit.toString(), shares: got, txHash: res.txHash },
    });
    const [holding, after] = await Promise.all([
      getChainHolding(project.onchainProjectId, user.nearAccountId!),
      getChainProject(project.onchainProjectId),
    ]);
    if (after) await prisma.project.update({ where: { id: project.id }, data: { sharesSold: after.shares_sold, status: after.status } });
    const refundYocto = deposit - BigInt(got) * price;
    return json({
      ok: true,
      shares: got,
      holding,
      refundNear: Number(refundYocto / (YOCTO_PER_NEAR / BigInt(10000))) / 10000,
      txHash: res.txHash,
      nearblocksUrl: res.nearblocksUrl,
      latencyMs: res.latencyMs,
    });
  } catch (e) {
    return handleError(e);
  }
}
