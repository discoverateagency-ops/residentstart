/* Recycles testnet NEAR for repeatable demos:
 *  1. dao.admin_withdraw(dao balance − reserve) → admin (owner)
 *  2. admin transfers so investor1/investor2 each hold at least TARGET NEAR
 * Usage: npx tsx --env-file=.env scripts/near-topup.ts [targetNear=50]
 */
import { KeyPair, Near, keyStores, providers, transactions } from "near-api-js";
import type { KeyPairString } from "@near-js/crypto";
import { sendTx } from "../lib/near-tx";

const NET = process.env.NEAR_NETWORK || "testnet";
const RPC = process.env.NEAR_RPC_URL || "https://test.rpc.fastnear.com";
const DAO = process.env.NEAR_DAO_CONTRACT || "dao.residentstart.testnet";
const Y = BigInt("1000000000000000000000000");
const TARGET = BigInt(Math.round(Number(process.argv[2] || 50))) * Y;
const RESERVE = BigInt(3) * Y; // keep for contract storage

const near = (n: bigint) => (Number(n / (Y / BigInt(1000))) / 1000).toFixed(3);

async function main() {
  const ks = new keyStores.InMemoryKeyStore();
  const admin = process.env.NEAR_ADMIN_ACCOUNT!;
  const investors = [process.env.NEAR_INVESTOR1_ACCOUNT!, process.env.NEAR_INVESTOR2_ACCOUNT!];
  await ks.setKey(NET, admin, KeyPair.fromString(process.env.NEAR_ADMIN_KEY! as KeyPairString));
  const conn = new Near({ networkId: NET, nodeUrl: RPC, keyStore: ks });
  const provider = conn.connection.provider as providers.JsonRpcProvider;
  const bal = async (a: string) => BigInt(((await provider.query({ request_type: "view_account", finality: "optimistic", account_id: a })) as unknown as { amount: string }).amount);
  const send = async (receiver: string, actions: transactions.Action[]) => {
    const out = await sendTx({ provider, network: NET, accountId: admin, privateKey: process.env.NEAR_ADMIN_KEY!, receiverId: receiver, actions });
    return out.transaction.hash as string;
  };

  const daoBal = await bal(DAO);
  console.log(`dao balance ${near(daoBal)} NEAR`);
  if (daoBal > RESERVE + Y) {
    const amount = daoBal - RESERVE;
    const h = await send(DAO, [transactions.functionCall("admin_withdraw", Buffer.from(JSON.stringify({ amount_yocto: amount.toString() })), BigInt("30000000000000"), BigInt(0))]);
    console.log(`withdrew ${near(amount)} NEAR → ${admin} (tx ${h})`);
  }
  for (const inv of investors) {
    const b = await bal(inv);
    if (b >= TARGET) { console.log(`${inv} has ${near(b)} NEAR (ok)`); continue; }
    const need = TARGET - b;
    const adminBal = await bal(admin);
    if (adminBal < need + Y) { console.log(`admin has only ${near(adminBal)} NEAR; cannot top up ${inv} by ${near(need)}`); continue; }
    const h = await send(inv, [transactions.transfer(need)]);
    console.log(`topped up ${inv} by ${near(need)} NEAR (tx ${h})`);
  }
  console.log(`admin now ${near(await bal(admin))} NEAR`);
}

main().catch((e) => { console.error(e); process.exit(1); });
