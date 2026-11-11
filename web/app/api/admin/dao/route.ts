import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { json, handleError } from "@/lib/http";
import { adminAccountId, callDao, getChainProject, getChainProposal, nearErrorMessage, YOCTO_PER_NEAR } from "@/lib/near";
import { getMainProject } from "@/lib/project";

export const maxDuration = 60;

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

export async function POST(req: Request) {
  try {
    await requireRole("admin");
    const body = (await req.json()) as { action: string; description?: string; proposalId?: string; status?: string };
    const project = await getMainProject();
    if (!project) return json({ error: "No project" }, 404);
    const signer = adminAccountId();

    try {
      switch (body.action) {
        case "create_project": {
          if (project.onchainProjectId) return json({ error: "Already created on-chain" }, 409);
          const id = `${project.slug}-${stamp()}`;
          const res = await callDao("create_project", {
            project_id: id,
            name: project.name,
            share_price_yocto: (BigInt(project.sharePriceNear) * YOCTO_PER_NEAR).toString(),
            total_shares: project.totalShares,
          }, { signer });
          await prisma.project.update({ where: { id: project.id }, data: { onchainProjectId: id, sharesSold: 0, status: "funding" } });
          return json({ ok: true, onchainProjectId: id, txHash: res.txHash, nearblocksUrl: res.nearblocksUrl });
        }
        case "create_proposal": {
          if (!project.onchainProjectId) return json({ error: "Create the project on-chain first" }, 400);
          if (await prisma.proposal.findFirst({ where: { projectId: project.id, status: "open" } })) return json({ error: "A proposal is already open" }, 409);
          const description = (body.description || "").trim() || `Approve ${project.name} for funding`;
          const res = await callDao<string>("create_proposal", { project_id: project.onchainProjectId, kind: "approve_funding", description }, { signer });
          const p = await prisma.proposal.create({
            data: { projectId: project.id, onchainProposalId: String(res.result), kind: "approve_funding", description, status: "open", createTx: res.txHash },
          });
          return json({ ok: true, proposal: p, txHash: res.txHash, nearblocksUrl: res.nearblocksUrl });
        }
        case "finalize": {
          const p = await prisma.proposal.findUnique({ where: { id: body.proposalId || "" } });
          if (!p) return json({ error: "Proposal not found" }, 404);
          if (p.status !== "open") return json({ error: "Already finalized" }, 409);
          const res = await callDao<string>("finalize_proposal", { proposal_id: p.onchainProposalId }, { signer });
          const chain = await getChainProposal(p.onchainProposalId);
          await prisma.proposal.update({
            where: { id: p.id },
            data: { status: String(res.result), finalizedTx: res.txHash, yesWeight: chain?.yes_weight ?? p.yesWeight, noWeight: chain?.no_weight ?? p.noWeight },
          });
          const cp = await getChainProject(project.onchainProjectId!);
          if (cp) await prisma.project.update({ where: { id: project.id }, data: { status: cp.status, sharesSold: cp.shares_sold } });
          return json({ ok: true, status: res.result, txHash: res.txHash, nearblocksUrl: res.nearblocksUrl });
        }
        case "set_status": {
          const s = body.status || "";
          if (!["funding", "funded", "in_construction", "completed"].includes(s)) return json({ error: "Invalid status" }, 400);
          if (!project.onchainProjectId) return json({ error: "Create the project on-chain first" }, 400);
          const res = await callDao("set_project_status", { project_id: project.onchainProjectId, status: s }, { signer });
          await prisma.project.update({ where: { id: project.id }, data: { status: s } });
          return json({ ok: true, txHash: res.txHash, nearblocksUrl: res.nearblocksUrl });
        }
        case "refresh": {
          const out: Record<string, unknown> = {};
          if (project.onchainProjectId) {
            const cp = await getChainProject(project.onchainProjectId);
            if (cp) await prisma.project.update({ where: { id: project.id }, data: { status: cp.status, sharesSold: cp.shares_sold } });
            out.project = cp;
          }
          for (const p of await prisma.proposal.findMany({ where: { projectId: project.id } })) {
            const c = await getChainProposal(p.onchainProposalId);
            if (c) await prisma.proposal.update({ where: { id: p.id }, data: { yesWeight: c.yes_weight, noWeight: c.no_weight, status: c.status } });
          }
          return json({ ok: true, ...out });
        }
        default:
          return json({ error: "Unknown action" }, 400);
      }
    } catch (e) {
      return json({ error: `Transaction failed: ${nearErrorMessage(e)}` }, 400);
    }
  } catch (e) {
    return handleError(e);
  }
}
