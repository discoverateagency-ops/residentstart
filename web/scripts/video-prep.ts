// Demo-video prep (video/PRD-4): buyer1 verified with no active loan, clean agent chats, investor1 balance check.
// Usage: npx tsx --env-file=.env scripts/video-prep.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const RPC = process.env.NEAR_RPC_URL || "https://test.rpc.fastnear.com";

async function balance(account: string): Promise<number> {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "final", account_id: account } }) });
  const j = await r.json();
  return Number(BigInt(j.result.amount) / BigInt("1000000000000000000000")) / 1000;
}

async function main() {
  const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer1@residentstart.demo" } });
  const investor = await prisma.user.findUniqueOrThrow({ where: { email: "investor1@residentstart.demo" } });

  // buyer1: drop any loan so Scene 6 starts from "Confirm installment"
  const loans = await prisma.loan.findMany({ where: { userId: buyer.id }, select: { id: true } });
  const ids = loans.map((l) => l.id);
  if (ids.length) {
    const pays = await prisma.payment.findMany({ where: { loanId: { in: ids } }, select: { id: true } });
    await prisma.paymentEvent.deleteMany({ where: { paymentId: { in: pays.map((p) => p.id) } } });
    await prisma.payment.deleteMany({ where: { loanId: { in: ids } } });
    await prisma.repaymentReceipt.deleteMany({ where: { loanId: { in: ids } } });
    await prisma.loan.deleteMany({ where: { id: { in: ids } } });
  }

  // buyer1 verified (admin override, same as the admin Buyers tab)
  const v = await prisma.verification.findFirst({ where: { userId: buyer.id }, orderBy: { createdAt: "desc" } });
  if (v) await prisma.verification.update({ where: { id: v.id }, data: { verified: true, method: "admin-override", verifiedAt: new Date() } });
  else await prisma.verification.create({ data: { userId: buyer.id, verified: true, method: "admin-override", verifiedAt: new Date() } });

  // empty chat panels on camera
  await prisma.agentMessage.deleteMany({ where: { userId: { in: [buyer.id, investor.id] } } });

  const bal = await balance(investor.nearAccountId!);
  console.log(`buyer1: ${ids.length} loan(s) removed, verified ✓ · investor1 ${investor.nearAccountId} ${bal} NEAR${bal < 11 ? " ✘ top up first (scripts/near-topup.ts)" : " ✓"}`);
}

main().finally(() => prisma.$disconnect());
